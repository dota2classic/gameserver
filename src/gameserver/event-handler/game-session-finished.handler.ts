import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';

@EventsHandler(GameSessionFinishedEvent)
export class GameSessionFinishedHandler
  implements IEventHandler<GameSessionFinishedEvent> {
  constructor(private readonly ebus: EventBus) {}

  async handle(event: GameSessionFinishedEvent) {
    this.ebus.publish(new MatchFinishedEvent(event.matchId, event.info));
  }
}
