import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { PlayerId } from 'gateway/shared-types/player-id';
//
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';

@Injectable()
export class GameServerSessionRepository {
  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    @InjectRepository(GameServerEntity)
    private readonly gameServerModelRepository: Repository<GameServerEntity>,
  ) {}

  async getAllFree(version: Dota2Version): Promise<GameServerEntity[]> {
    return await this.gameServerModelRepository.query(`select gs.*
      from game_server_model gs
      left join game_server_session_model gssm on gs.url = gssm.url
      where gs.version = '${version}'
      group by gs.url, gs.version
      having count(gssm) = 0`);
  }

  // FIXME: use proper query
  public async findWith(
    playerId: PlayerId,
  ): Promise<GameServerSessionEntity | undefined> {
    const all = await this.gameServerSessionModelRepository.find({
      relations: ['players']
    });

    return all.find(
      (t) =>
        t.gameState !== Dota_GameRulesState.POST_GAME &&
        t.players.find(
          (z) => z.steamId === playerId.value && z.abandoned === false,
        ),
    );
  }
}
