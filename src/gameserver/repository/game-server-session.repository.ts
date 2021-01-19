import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { PlayerId } from 'gateway/shared-types/player-id';
//
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameServerModel } from 'gameserver/model/game-server.model';

@Injectable()
export class GameServerSessionRepository {
  constructor(
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
    >,
    @InjectRepository(GameServerModel)
    private readonly gameServerModelRepository: Repository<GameServerModel>,
    private readonly gameServerRepository: GameServerRepository,
  ) {}

  async getAllFree(version: Dota2Version): Promise<GameServerModel[]> {
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
        url: compatible[i].url,
      });
      if (!isBusy) {
        return compatible[i];
      }
    }
    return false;
  }

  public async findWith(
    playerId: PlayerId,
  ): Promise<GameServerSessionModel | undefined> {
    const all = await this.gameServerSessionModelRepository.find();

    return all.find(t =>
      [...t.matchInfoJson.radiant]
        .concat(t.matchInfoJson.dire)
        .find(z => z.value === playerId.value),
    );
  }
}
