import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { PlayerId } from 'gateway/shared-types/player-id';
//
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameServerEntity } from 'gameserver/model/game-server.entity';

@Injectable()
export class GameServerSessionRepository {
  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
    >,
    @InjectRepository(GameServerEntity)
    private readonly gameServerModelRepository: Repository<GameServerEntity>,
    private readonly gameServerRepository: GameServerRepository,
  ) {}

  async getAllFree(version: Dota2Version): Promise<GameServerEntity[]> {
    return await this.gameServerModelRepository.query(`select gs.*
      from game_server_model gs
      left join game_server_session_model gssm on gs.url = gssm.url
      where gs.version = '${version}'
      group by gs.url, gs.version
      having count(gssm) = 0`);
  }

  async findFree(version: Dota2Version) {
    const compatible = await this.gameServerRepository.find(version);
    for (let i = 0; i < compatible.length; i++) {
      const isBusy = await this.gameServerSessionModelRepository.findOne({
        where: { url: compatible[i].url,}
      });
      if (!isBusy) {
        return compatible[i];
      }
    }
    return false;
  }

  public async findWith(
    playerId: PlayerId,
  ): Promise<GameServerSessionEntity | undefined> {
    const all = await this.gameServerSessionModelRepository.find();

    return all.find(t =>
      t.matchInfoJson.players
        .find(z => z.playerId.value === playerId.value),
    );
  }
}
