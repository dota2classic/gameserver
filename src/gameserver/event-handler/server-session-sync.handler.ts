import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerSessionSyncEvent } from 'gateway/events/gs/server-session-sync.event';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';

@EventsHandler(ServerSessionSyncEvent)
export class ServerSessionSyncHandler
  implements IEventHandler<ServerSessionSyncEvent> {
  constructor(
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: ServerSessionSyncEvent) {
    const existingSession = await this.gameServerSessionModelRepository.findOne(
      {
        url: event.url,
      },
    );

    if (!existingSession) {
      const newSession = new GameServerSessionModel();
      newSession.url = event.url;
      newSession.matchId = event.matchId;
      newSession.matchInfoJson = event.info;

      await this.gameServerSessionModelRepository.save(newSession);
      // this.ebus.publish(
      //   new GameSessionCreatedEvent(event.url, event.matchId, event.info),
      // );
    }
  }
}
