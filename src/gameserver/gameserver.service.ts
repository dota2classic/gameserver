import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { LessThanOrEqual, Repository } from 'typeorm';
import { GameSeason } from 'gameserver/entity/GameSeason';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { PlayerId } from 'gateway/shared-types/player-id';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { inspect } from 'util';
import {
  MatchmakingMode,
  MatchmakingModes,
} from 'gateway/shared-types/matchmaking-mode';

@Injectable()
export class GameServerService {
  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(GameSeason)
    private readonly gameSeasonRepository: Repository<GameSeason>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
  ) {}

  public async getCurrentSeason(version: Dota2Version): Promise<GameSeason> {
    return this.gameSeasonRepository.findOne({
      where: {
        start_timestamp: LessThanOrEqual(new Date()),
      },
      order: {
        start_timestamp: 'DESC',
      },
    });
  }

  public async getGamesPlayed(
    season: GameSeason,
    pid: PlayerId,
    mode: MatchmakingMode,
  ) {
    let plr = await this.versionPlayerRepository.findOne({
      version: Dota2Version.Dota_681,
      steam_id: pid.value,
    });

    if (!plr) {
      plr = new VersionPlayer();
      plr.steam_id = pid.value;
      plr.version = season.version;
      plr.mmr = VersionPlayer.STARTING_MMR;
      await this.versionPlayerRepository.save(plr);
    }

    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where('pim.playerId = :id', { id: plr.steam_id })
      .andWhere('m.type = :mode', { mode })
      .andWhere('m.timestamp > :season', { season: season.start_timestamp })
      .getCount();
  }
}
