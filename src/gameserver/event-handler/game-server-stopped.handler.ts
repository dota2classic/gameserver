import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(GameServerStoppedEvent)
export class GameServerStoppedHandler
  implements IEventHandler<GameServerStoppedEvent> {
  constructor(
    private readonly gsRepo: GameServerSessionRepository,
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionModel>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: GameServerStoppedEvent) {
    const runningSession = await this.gameServerSessionModelRepository.findOne({
      where: { url: event.url }
    });
    if (runningSession) {
      await this.gameServerSessionModelRepository.delete(runningSession.url);
      this.ebus.publish(
        new GameSessionFinishedEvent(
          runningSession.url,
          runningSession.matchId,
          runningSession.matchInfoJson
        ),
      );
    }
  }
}
