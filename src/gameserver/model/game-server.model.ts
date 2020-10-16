import { AggregateRoot } from '@nestjs/cqrs';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchInfo } from 'gateway/events/room-ready.event';

export class GameServerModel extends AggregateRoot {

  constructor(
    public readonly url: string,
    public readonly version: Dota2Version,
  ) {
    super();
  }

}
