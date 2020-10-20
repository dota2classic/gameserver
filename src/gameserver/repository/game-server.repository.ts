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
  }

  async find(version: Dota2Version) {
    return [...this.cache.values()].filter(
      t => t.version === version,
    );
  }
}
