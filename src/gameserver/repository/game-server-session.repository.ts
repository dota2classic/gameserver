import { Injectable } from '@nestjs/common';
import { RuntimeRepository } from 'util/runtime-repository';
import { EventPublisher } from '@nestjs/cqrs';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { PlayerId } from 'gateway/shared-types/player-id';
//
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class GameServerSessionRepository {
  constructor(
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
    >,
    private readonly gameServerRepository: GameServerRepository,
  ) {}

  async findFree(version: Dota2Version) {
    const compatible = await this.gameServerRepository.find(version);
    for (let i = 0; i < compatible.length; i++) {
      const isBusy = await this.gameServerSessionModelRepository.findOne(compatible[i].url);
      if (!isBusy) {
        return compatible[i];
      }
    }
    return false;
  }

  public async findWith(
    playerId: PlayerId,
  ): Promise<GameServerSessionModel | undefined> {

    const all = await this.gameServerSessionModelRepository.find()

    return all.find(t =>
      [...t.matchInfoJson.radiant]
        .concat(t.matchInfoJson.dire)
        .find(z => z.value === playerId.value),
    );
  }
}
