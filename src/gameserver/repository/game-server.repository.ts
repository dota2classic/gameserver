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
    this.save("test", new GameServerModel("test", Dota2Version.Dota_681))
  }
  async find(version: Dota2Version) {
    return [...this.cache.values()].find(
      t => !t.running && t.version === version,
    );
  }
}
