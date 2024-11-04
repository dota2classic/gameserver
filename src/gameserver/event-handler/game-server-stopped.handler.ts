import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@EventsHandler(GameServerStoppedEvent)
export class GameServerStoppedHandler
  implements IEventHandler<GameServerStoppedEvent> {

  private logger = new Logger(GameServerStoppedHandler.name)
  constructor(
    private readonly gsRepo: GameServerSessionRepository,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
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
