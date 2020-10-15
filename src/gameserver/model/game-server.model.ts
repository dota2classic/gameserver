import { AggregateRoot } from '@nestjs/cqrs';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerFoundEvent } from 'gateway/events/game-server-found.event';

export class GameServerModel extends AggregateRoot {
  public running: boolean = false;
  public roomId?: string;

  constructor(
    public readonly url: string,
    public readonly version: Dota2Version,
  ) {
    super();
  }

  attach(roomId: string) {
    this.roomId = roomId;
    this.apply(new GameServerFoundEvent(this.url, this.roomId, this.version));
  }
}
