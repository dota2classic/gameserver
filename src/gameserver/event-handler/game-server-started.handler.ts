import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStartedEvent } from 'gateway/events/game-server-started.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';

@EventsHandler(GameServerStartedEvent)
export class GameServerStartedHandler
  implements IEventHandler<GameServerStartedEvent> {
  constructor(private readonly ebus: EventBus) {}

  async handle(event: GameServerStartedEvent) {
    this.ebus.publish(new MatchStartedEvent(event.matchId, event.info));
  }
}
