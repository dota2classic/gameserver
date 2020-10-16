import { AggregateRoot } from '@nestjs/cqrs';
import { MatchInfo } from 'gateway/events/room-ready.event';

export class GameServerSessionModel extends AggregateRoot {
  constructor(public readonly url: string,
              public readonly matchId: number,
              public readonly info: MatchInfo) {
    super();
  }
}
