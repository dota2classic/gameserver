import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';

@EventsHandler(GameServerStoppedEvent)
export class GameServerStoppedHandler
  implements IEventHandler<GameServerStoppedEvent> {
  constructor(
    private readonly gsRepo: GameServerSessionRepository,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: GameServerStoppedEvent) {
    const runningSession = await this.gsRepo.get(event.url);
    if (runningSession) {
      await this.gsRepo.delete(runningSession.url);
      this.ebus.publish(
        new GameSessionFinishedEvent(
          runningSession.url,
          runningSession.matchId,
          runningSession.info,
        ),
      );
    }
  }
}
