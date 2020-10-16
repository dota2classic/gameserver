import { GameServerModel } from 'gameserver/model/game-server.model';
import { RuntimeRepository } from 'util/runtime-repository';
import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { EventPublisher } from '@nestjs/cqrs';

@Injectable()
export class GameServerRepository extends RuntimeRepository<
  GameServerModel,
  'url'
> {

  constructor(eventPublisher: EventPublisher) {
    super(eventPublisher);
    this.save("glory.dota2classic.ru:27015", new GameServerModel("glory.dota2classic.ru:27015", Dota2Version.Dota_681))
  }

  async find(version: Dota2Version) {
    return [...this.cache.values()].filter(
      t => t.version === version,
    );
  }
}
