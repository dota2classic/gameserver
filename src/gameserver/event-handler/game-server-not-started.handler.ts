import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerNotStartedEvent } from 'gateway/events/game-server-started.event';
import { MatchCancelledEvent } from 'gateway/events/match-cancelled.event';

@EventsHandler(GameServerNotStartedEvent)
export class GameServerNotStartedHandler
  implements IEventHandler<GameServerNotStartedEvent> {
  constructor(private readonly ebus: EventBus) {}

  async handle(event: GameServerNotStartedEvent) {
    this.ebus.publish(new MatchCancelledEvent(event.matchId, event.info));
  }
}
