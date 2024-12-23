import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SrcdsServerStartedEvent } from 'gateway/events/srcds-server-started.event';
import { MatchEntity } from 'gameserver/model/match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { GameServerInfo } from 'gateway/shared-types/game-server-info';

@EventsHandler(SrcdsServerStartedEvent)
export class SrcdsServerStartedHandler
  implements IEventHandler<SrcdsServerStartedEvent>
{
  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionEntityRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: SrcdsServerStartedEvent) {
    const m = await this.matchEntityRepository.findOneOrFail({
      where: { id: event.matchId },
    });

    m.server = event.server;
    await this.matchEntityRepository.save(m);

    const session = new GameServerSessionEntity();
    session.url = event.server;

    session.matchId = m.id;
    session.matchInfoJson = {
      ...event.info,
    };

    await this.gameServerSessionEntityRepository.save(session);

    this.ebus.publish(
      new GameSessionCreatedEvent(
        session.url,
        session.matchId,
        session.matchInfoJson,
      ),
    );

    this.ebus.publish(
      new MatchStartedEvent(
        session.matchId,
        session.matchInfoJson,
        new GameServerInfo(session.url),
      ),
    );
  }
}
