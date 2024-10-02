import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

type GetMmr = (plr: VersionPlayerEntity) => number;

interface TeamBalance {
  winnerAverage: number;
  loserAverage: number;
  diffDeviationFactor: number;
}
@CommandHandler(ProcessRankedMatchCommand)
export class ProcessRankedMatchHandler
  implements ICommandHandler<ProcessRankedMatchCommand> {
  private static readonly Slogger = new Logger(ProcessRankedMatchHandler.name);

  private readonly logger = ProcessRankedMatchHandler.Slogger;

  public static readonly AVERAGE_DIFF_CAP = 300;
  public static readonly AVERAGE_DEVIATION_MAX = 15;

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    private readonly gameServerService: GameServerService,
    @InjectRepository(MmrChangeLogEntity)
    private readonly mmrChangeLogEntityRepository: Repository<
      MmrChangeLogEntity
    >,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<
      FinishedMatchEntity
    >,
    private readonly cbus: CommandBus,
    private readonly connection: Connection,
  ) {}

  public static calculateMmrDeviation(
    winnerAverageMmr: number,
    loserAverageMmr: number,
    max: number = ProcessRankedMatchHandler.AVERAGE_DEVIATION_MAX,
    diffCap: number = ProcessRankedMatchHandler.AVERAGE_DIFF_CAP,
  ) {
    const averageDiff = Math.abs(winnerAverageMmr - loserAverageMmr);
    const sign = winnerAverageMmr > loserAverageMmr ? -1 : 1;

    // how much to add to remove from winners and add to losers
    return sign * ((max * Math.min(averageDiff, diffCap)) / diffCap);
  }

  public static computeMMRChange(
    steam_id: string,
    cbGame: number,
    win: boolean,
    mmrDiff: number,
    cbGames: number = 10,
    baseMMRChange: number = 25,
    kindGames: number = 3,
  ): number {
    let baseMMR = baseMMRChange;

    if (cbGame < cbGames && cbGame < kindGames) {
      baseMMR = 50;
    } else if (cbGame < cbGames) {
      // gradually reducing mmr
      baseMMR = 100;
    }

    return (win ? 1 : -1) * (baseMMR + mmrDiff);
    // return (
    //   (win ? baseMMRChange : -baseMMRChange) + (win ? -mmrDiff : mmrDiff)
    // );
  }

  async execute(command: ProcessRankedMatchCommand) {
    // find latest season which start_timestamp > now
    const currentSeason = await this.gameServerService.getCurrentSeason(
      Dota2Version.Dota_681,
    );

    if (await this.isAlreadyProcessed(command.matchId)) return;

    const playerMap = await this.getVersionPlayerMap(command);

    if (playerMap.size !== command.winners.length + command.losers.length) {
      this.logger.error(
        `Version player map did not match. Cancelling match ${command.matchId} processing`,
      );
      return;
    }

    const m = await this.finishedMatchEntityRepository.findOneOrFail({
      where: {
        id: command.matchId,
      },
    });

    const isHiddenMmr = command.mode !== MatchmakingMode.RANKED;

    const {
      diffDeviationFactor,
      winnerAverage,
      loserAverage,
    } = this.getTeamBalance(command, playerMap);

    const changelogs = await Promise.all(
      [...command.winners, ...command.losers].map((t, idx) =>
        this.changeMMR(
          currentSeason,
          t,
          idx < command.winners.length,
          diffDeviationFactor,
          winnerAverage,
          loserAverage,
          command.matchId,
          isHiddenMmr,
          m.timestamp,
          playerMap,
        ),
      ),
    );

    const qr = this.connection.createQueryRunner();
    await qr.startTransaction();
    try {
      await this.mmrChangeLogEntityRepository.save(changelogs);
      this.logger.log('Saved mmr change log entities');

      await this.versionPlayerRepository.save(Array.from(playerMap.values()));
      this.logger.log('Saved version player changes');

      await qr.commitTransaction();
    } catch (e) {
      this.logger.error('Error while saving mmr changes');
      await qr.rollbackTransaction();
    } finally {
      await qr.release();
    }
  }

  private async makeSureAllPlayersExist(command: ProcessRankedMatchCommand) {
    await Promise.all(
      [...command.winners, ...command.losers].map(id =>
        this.cbus.execute(new MakeSureExistsCommand(id)),
      ),
    );
  }

  private async isAlreadyProcessed(matchId: number): Promise<boolean> {
    const check = await this.mmrChangeLogEntityRepository.count({
      where: { matchId: matchId },
    });

    if (check > 0) {
      this.logger.log(
        `MATCH ${matchId} TRIED TO BE PROCESSED TWICE. CANCELLING`,
      );
    }

    return check > 0;
  }

  private async getVersionPlayerMap(command: ProcessRankedMatchCommand) {
    const map = new Map<string, VersionPlayerEntity>();
    const plrs = await this.versionPlayerRepository.find({
      where: {
        steam_id: In([...command.losers, ...command.winners].map(t => t.value)),
      },
    });

    plrs.forEach(plr => map.set(plr.steam_id, plr));

    // here we do some tricks
    [...command.losers, ...command.winners].forEach(pid => {
      if (!map.has(pid.value)) {
        const vp = new VersionPlayerEntity();
        vp.steam_id = pid.value;
        vp.hidden_mmr = VersionPlayerEntity.STARTING_MMR;
        vp.mmr = VersionPlayerEntity.STARTING_MMR;
        vp.version = Dota2Version.Dota_681;
        map.set(pid.value, vp);
      }
    });

    return map;
  }

  private getTeamBalance(
    command: ProcessRankedMatchCommand,
    playerMap: Map<string, VersionPlayerEntity>,
  ): TeamBalance {
    const isHiddenMmr = command.mode !== MatchmakingMode.RANKED;

    const getMmr: GetMmr = (plr: VersionPlayerEntity): number =>
      isHiddenMmr ? plr.hidden_mmr : plr.mmr;

    const winnerMMR = command.winners
      .map(t => playerMap[t.value])
      .reduce((a, b) => a + getMmr(b), 0);

    const loserMMR = command.losers
      .map(t => playerMap[t.value])
      .reduce((a, b) => a + getMmr(b), 0);

    const winnerAverage = winnerMMR / command.winners.length;
    const loserAverage = loserMMR / command.losers.length;

    return {
      winnerAverage,
      loserAverage,
      diffDeviationFactor: ProcessRankedMatchHandler.calculateMmrDeviation(
        winnerAverage,
        loserAverage,
      ),
    };
  }

  private async changeMMR(
    season: GameSeasonEntity,
    pid: PlayerId,
    winner: boolean,
    mmrDiff: number,
    winnerAverage: number,
    loserAverage: number,
    matchId: number,
    hiddenMmr: boolean,
    matchTimestamp: string,
    playerMap: Map<string, VersionPlayerEntity>,
  ) {
    const cb = await this.gameServerService.getGamesPlayed(
      season,
      pid,
      undefined,
      matchTimestamp,
    );

    const plr = playerMap[pid.value];

    const mmrChange = Math.round(
      ProcessRankedMatchHandler.computeMMRChange(
        plr.steam_id,
        cb,
        winner,
        mmrDiff,
        0, // CB GAMES = 0 for now
      ),
    );

    this.logger.log(
      `Updating ${hiddenMmr ? 'hidden' : 'real'} MMR for ${
        plr.steam_id
      }. Now: ${hiddenMmr ? plr.hidden_mmr : plr.mmr}, change: ${mmrChange}`,
    );

    try {
      if (hiddenMmr) {
        plr.hidden_mmr = plr.hidden_mmr + mmrChange;
      } else {
        plr.mmr = plr.mmr + mmrChange;
      }

      const change = new MmrChangeLogEntity();
      change.playerId = pid.value;
      change.loserAverage = Number(loserAverage);
      change.winnerAverage = Number(winnerAverage);
      change.change = Number(mmrChange);
      change.winner = winner;
      change.hiddenMmr = hiddenMmr;
      change.mmrBefore = Number(hiddenMmr ? plr.hidden_mmr : plr.mmr);
      change.mmrAfter = Number(change.mmrBefore + mmrChange);
      change.matchId = matchId;
      return change;
    } catch (e) {
      console.error(e);
    }
  }
}
