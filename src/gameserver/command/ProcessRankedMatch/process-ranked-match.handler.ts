import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@CommandHandler(ProcessRankedMatchCommand)
export class ProcessRankedMatchHandler
  implements ICommandHandler<ProcessRankedMatchCommand> {
  private readonly logger = new Logger(ProcessRankedMatchHandler.name);

  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    private readonly gameServerService: GameServerService,
  ) {}

  async execute(command: ProcessRankedMatchCommand) {
    // find latest season which start_timestamp > now
    const currentSeason = await this.gameServerService.getCurrentSeason(
      Dota2Version.Dota_681,
    );

    await Promise.all(
      command.winners.map(t => this.changeMMR(currentSeason, t, true)),
    );
    await Promise.all(
      command.losers.map(t => this.changeMMR(currentSeason, t, false)),
    );
    // let's keep it simple for now
  }

  private async changeMMR(season: GameSeason, pid: PlayerId, winner: boolean) {
    const cb = await this.gameServerService.getGamesPlayed(
      season,
      pid,
      MatchmakingMode.RANKED,
    );
    const plr = await this.versionPlayerRepository.findOneOrFail({
      version: season.version,
      steam_id: pid.value,
    });

    const mmrChange = Math.round(
      this.computeMMRChange(plr.steam_id, cb, winner),
    );

    this.logger.log(
      `Updating MMR for ${plr.steam_id}. Now: ${plr.mmr}, change: ${mmrChange}`,
    );

    // console.log(
    //   `MMR Change for ${pid.value}: ${mmrChange}. Was ${
    //     plr.mmr
    //   } became ${plr.mmr + mmrChange}`,
    // );

    plr.mmr = plr.mmr + mmrChange;
    await this.versionPlayerRepository.save(plr);
    this.logger.log(`Saved mmr for ${plr.steam_id} successfully`);
  }

  private computeMMRChange(
    steam_id: string,
    cbGame: number,
    win: boolean,
  ): number {
    let baseMMR;



    // ffs
    // return win ? 25 : -25;
    // total calibration games
    const cbGames = 10;

    this.logger.log(
      `${steam_id}, computing mmr change. GamesPlayed: ${cbGame}. Winner: ${win}`,
    );

    // if we're over calibration game limit, we go ±25 mmr
    if (cbGame > cbGames) {
      return 25;
    }

    // first 3 games are kind and 50± mmr only
    const offset = 3;

    const offsetContext = cbGames - offset;

    // if in "kind" games 50 mmr
    if (cbGame < offset) {
      baseMMR = 50;
    } else {
      // gradually reducing mmr
      const component = Math.exp((offsetContext - cbGame) / offsetContext);
      baseMMR = Math.round(component * 100);
    }

    return win ? baseMMR : -baseMMR;
  }
}
