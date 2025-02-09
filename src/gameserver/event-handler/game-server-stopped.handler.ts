import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';

@EventsHandler(GameServerStoppedEvent)
export class GameServerStoppedHandler
  implements IEventHandler<GameServerStoppedEvent>
{
  private logger = new Logger(GameServerStoppedHandler.name);
  constructor(
    private readonly gsRepo: GameServerSessionRepository,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
    private readonly dataSource: DataSource,
  ) {}

  async handle(event: GameServerStoppedEvent) {
    const runningSession = await this.gameServerSessionModelRepository.findOne({
      where: { url: event.url },
    });

    if (runningSession) {

      await this.endGameSession(event.url);
      this.ebus.publish(
        new GameSessionFinishedEvent(
          runningSession.url,
          runningSession.matchId,
          runningSession.asGsMatchInfo(),
        ),
      );
    }
  }

  private async endGameSession(url: string) {
    await this.dataSource.transaction(async (em) => {
      const session = await em.findOne<GameServerSessionEntity>(
        GameServerSessionEntity,
        { where: { url: url }, relations: ["players"] },
      );
      if (!session) return;

      await em.remove(GameSessionPlayerEntity, session.players);
      await em.remove(GameServerSessionEntity, session);
    });
  }
}
