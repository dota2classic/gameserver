import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { MmrBucketService } from 'gameserver/mmr-bucket.service';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';

type GetMmr = (plr: VersionPlayerEntity) => number;

interface TeamBalance {
  winnerAverage: number;
  loserAverage: number;
  diffDeviationFactor: number;
}

@CommandHandler(ProcessRankedMatchCommand)
export class ProcessRankedMatchHandler
  implements ICommandHandler<ProcessRankedMatchCommand>
{
  private static readonly Slogger = new Logger(ProcessRankedMatchHandler.name);

  public static TOTAL_CALIBRATION_GAMES = 10;

  private readonly logger = ProcessRankedMatchHandler.Slogger;

  public static readonly AVERAGE_DIFF_CAP = 300;
  public static readonly AVERAGE_DEVIATION_MAX = 15;

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(MmrChangeLogEntity)
    private readonly mmrChangeLogEntityRepository: Repository<MmrChangeLogEntity>,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    private readonly gameServerService: GameServerService,
    private readonly cbus: CommandBus,
    private readonly mmrBucketService: MmrBucketService,
    private readonly datasource: DataSource,
    private readonly seasonService: GameSeasonService,
    private readonly plrService: PlayerServiceV2,
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

  public computeMMRChange(
    cbGame: number,
    win: boolean,
    mmrDiff: number,
    cbGames: number = 10,
    baseMMRChange: number = 25,
    playerPerformanceCoefficient: number,
  ): number {
    const isCalibrationGame = cbGame < cbGames;

    const maxAbsoluteChange = 600;

    let baseMMR = isCalibrationGame ? 100 : baseMMRChange;

    const change = (win ? 1 : -1) * (baseMMR + mmrDiff);

    const playerPerformanceCorrection = isCalibrationGame
      ? win
        ? playerPerformanceCoefficient
        : 1 / playerPerformanceCoefficient
      : 1;

    let mmrChange = change * playerPerformanceCorrection;
    mmrChange = Math.min(mmrChange, maxAbsoluteChange);
    mmrChange = Math.max(mmrChange, -maxAbsoluteChange);

    this.logger.log(
      `Player mmr change: cb=${isCalibrationGame}, win=${win}, base=${change.toFixed(0)}, playerPerformanceCorrection=${playerPerformanceCorrection.toFixed(1)}, result = ${mmrChange} `,
    );

    return mmrChange;
  }

  async execute(command: ProcessRankedMatchCommand) {
    if (
      command.mode !== MatchmakingMode.UNRANKED &&
      command.mode !== MatchmakingMode.RANKED
    )
      return;

    // find latest season which start_timestamp > now
    const currentSeason = await this.seasonService.getCurrentSeason();

    if (await this.isAlreadyProcessed(command.matchId)) return;

    const playerMap = await this.getVersionPlayerMap(command, currentSeason);

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

    this.logger.log(`Processing ranked match ${m.id}`);
    const { diffDeviationFactor, winnerAverage, loserAverage } =
      this.getTeamBalance(command, playerMap);

    const changelogs = await Promise.all(
      [...command.winners, ...command.losers].map(async (playerId, idx) =>
        this.changeMMR(
          currentSeason,
          playerId.value,
          idx < command.winners.length,
          diffDeviationFactor,
          winnerAverage,
          loserAverage,
          command.matchId,
          m.timestamp,
          playerMap,
          m.players.find((it) => it.playerId === playerId.value)?.abandoned ||
            false,
        ),
      ),
    );

    await this.datasource.transaction(async ($em) => {
      await $em.save<MmrChangeLogEntity>(changelogs);
      this.logger.log("Saved mmr change log entities");

      await $em.save(Array.from(playerMap.values()));
      this.logger.log("Saved version player changes");
    });
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

  private async getVersionPlayerMap(
    command: ProcessRankedMatchCommand,
    currentSeason: GameSeasonEntity,
  ) {
    const map = new Map<string, VersionPlayerEntity>();
    const plrs = await this.versionPlayerRepository.find({
      where: {
        steamId: In(
          [...command.losers, ...command.winners].map((t) => t.value),
        ),
        seasonId: currentSeason.id,
      },
    });

    plrs.forEach((plr) => map.set(plr.steamId, plr));

    // here we do some tricks
    [...command.losers, ...command.winners].forEach((pid) => {
      if (!map.has(pid.value)) {
        const vp = new VersionPlayerEntity(
          pid.value,
          VersionPlayerEntity.STARTING_MMR,
          currentSeason.id,
        );
        map.set(pid.value, vp);
      }
    });

    return map;
  }

  private getTeamBalance(
    command: ProcessRankedMatchCommand,
    playerMap: Map<string, VersionPlayerEntity>,
  ): TeamBalance {
    const getMmr: GetMmr = (plr: VersionPlayerEntity): number => plr.mmr;

    const winnerMMR = command.winners
      .map((t) => playerMap.get(t.value))
      .reduce((a, b) => a + getMmr(b), 0);

    const loserMMR = command.losers
      .map((t) => playerMap.get(t.value))
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
    steamId: string,
    winner: boolean,
    mmrDiff: number,
    winnerAverage: number,
    loserAverage: number,
    matchId: number,
    matchTimestamp: string,
    playerMap: Map<string, VersionPlayerEntity>,
    didAbandon: boolean,
  ) {
    const cb = await this.plrService.getGamesPlayed(
      season,
      steamId,
      [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      matchTimestamp,
    );
    const plr = playerMap.get(steamId);

    // Calculate player performance coefficient
    const playerPerformanceCoefficient =
      await this.mmrBucketService.additionalPerformanceCoefficient(
        plr.mmr,
        // await this.mmrBucketService.getPlayerFpmInSeason(plr.steamId),
        await this.mmrBucketService.getPlayerInMatchFpm(plr.steamId, matchId),
      );

    this.logger.log(
      `Player's ${plr.steamId} performance coefficient is ${playerPerformanceCoefficient}`,
    );

    let mmrChange = Math.round(
      this.computeMMRChange(
        cb,
        winner,
        mmrDiff,
        ProcessRankedMatchHandler.TOTAL_CALIBRATION_GAMES, // CB GAMES = 0 for now
        25,
        playerPerformanceCoefficient,
      ),
    );

    if (didAbandon) {
      mmrChange = -Math.abs(mmrChange);
    }

    this.logger.log(
      `Updating MMR for ${plr.steamId}. Now: ${plr.mmr}, change: ${mmrChange}`,
    );

    try {
      let mmrBefore: number;
      mmrBefore = plr.mmr;
      plr.mmr = plr.mmr + mmrChange;

      const change = new MmrChangeLogEntity();
      change.playerId = steamId;
      change.loserAverage = Number(loserAverage);
      change.winnerAverage = Number(winnerAverage);
      change.calibration =
        cb < ProcessRankedMatchHandler.TOTAL_CALIBRATION_GAMES;
      change.change = Number(mmrChange);
      change.winner = winner;
      change.hiddenMmr = true;
      change.mmrBefore = mmrBefore;
      change.mmrAfter = Number(mmrBefore + mmrChange);
      change.matchId = matchId;
      change.playerPerformanceCoefficient = playerPerformanceCoefficient;
      return change;
    } catch (e) {
      this.logger.error("Couldn't create mmr change ", e);
    }
  }
}
