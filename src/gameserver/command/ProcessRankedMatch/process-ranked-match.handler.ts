import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { PlayerId } from 'gateway/shared-types/player-id';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@CommandHandler(ProcessRankedMatchCommand)
export class ProcessRankedMatchHandler
  implements ICommandHandler<ProcessRankedMatchCommand> {
  private readonly logger = new Logger(ProcessRankedMatchHandler.name);

  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(GameSeason)
    private readonly gameSeasonRepository: Repository<GameSeason>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
  ) {}

  async execute(command: ProcessRankedMatchCommand) {
    // find latest season which start_timestamp > now
    const currentSeason = await this.gameSeasonRepository.findOne({
      where: {
        start_timestamp: LessThanOrEqual(new Date()),
      },
      order: {
        start_timestamp: 'DESC',
      },
    });

    await Promise.all(
      command.winners.map(t => this.changeMMR(currentSeason, t, true)),
    );
    await Promise.all(
      command.losers.map(t => this.changeMMR(currentSeason, t, false)),
    );
    // let's keep it simple for now
  }

  private async changeMMR(season: GameSeason, pid: PlayerId, winner: boolean) {
    const cb = await this.getCalibrationGamesPlayed(season, pid);
    const plr = await this.versionPlayerRepository.findOne({
      version: season.version,
      steam_id: pid.value,
    });

    console.log(
      `Changing mmr for ${pid.value}. MMR: ${plr.mmr} Winner: ${winner}. Season: ${season.id}. CB: ${cb}`,
    );

    let mmrChange = cb < 10 ? 100 : 25;
    mmrChange = winner ? +mmrChange : -mmrChange;

    plr.mmr = plr.mmr + mmrChange;
    await this.versionPlayerRepository.save(plr);
    console.log(`MMR change: ${mmrChange}. New mmr: ${plr.mmr}`);
  }

  private async getCalibrationGamesPlayed(season: GameSeason, pid: PlayerId) {
    let plr = await this.versionPlayerRepository.findOne({
      version: season.version,
      steam_id: pid.value,
    });
    if (!plr) {
      plr = new VersionPlayer();
      plr.steam_id = pid.value;
      plr.version = season.version;
      plr.mmr = 3000;
      await this.versionPlayerRepository.save(plr);
      return 0;
    } else {
      return this.playerInMatchRepository.count({
        where: {
          playerId: plr.steam_id,
          match: {
            type: MatchmakingMode.RANKED,
            timestamp: MoreThan(season.start_timestamp),
          },
        },
      });
    }
  }
}
