import { Injectable } from '@nestjs/common';
import { RuntimeRepository } from 'util/runtime-repository';
import { EventPublisher } from '@nestjs/cqrs';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { PlayerId } from 'gateway/shared-types/player-id';

@Injectable()
export class GameServerSessionRepository extends RuntimeRepository<
  GameServerSessionModel,
  'url'
> {
  constructor(
    eventPublisher: EventPublisher,
    private readonly gameServerRepository: GameServerRepository,
  ) {
    super(eventPublisher);
  }

  async findFree(version: Dota2Version) {
    const compatible = await this.gameServerRepository.find(version);
    for (let i = 0; i < compatible.length; i++) {
      const isBusy = await this.get(compatible[i].url)
      if (!isBusy) {
        return compatible[i];
      }
    }
    return false;
  }

  public async findWith(playerId: PlayerId): Promise<GameServerSessionModel | undefined> {
    return [...this.cache.values()].find(t => [...t.info.radiant].concat(t.info.dire).find(z => z.value === playerId.value))
  }
}