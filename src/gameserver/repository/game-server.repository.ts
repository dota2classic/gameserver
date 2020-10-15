import { GameServerModel } from 'gameserver/model/game-server.model';
import { RuntimeRepository } from 'util/runtime-repository';
import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@Injectable()
export class GameServerRepository extends RuntimeRepository<
  GameServerModel,
  'url'
> {
  async find(version: Dota2Version) {
    return [...this.cache.values()].find(
      t => !t.running && t.version === version,
    );
  }
}
