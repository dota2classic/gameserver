import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStartedEvent } from 'gateway/events/game-server-started.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(GameServerStartedEvent)
export class GameServerStartedHandler
  implements IEventHandler<GameServerStartedEvent> {
  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
    >,
  ) {}

  async handle(event: GameServerStartedEvent) {
    // we create session only if match is started 4real
    // const session = new GameServerSessionModel();
    // session.url = event.url;
    //
    // session.matchId = event.matchId;
    // session.matchInfoJson = event.info;
    //
    // await this.gameServerSessionModelRepository.save(session);
    //
    // this.ebus.publish(
    //   new GameSessionCreatedEvent(event.url, event.matchId, event.info),
    // );

    // const allSessions = await this.gameServerSessionModelRepository.find();
    //
    // const isOkServerStarted = allSessions.find(
    //   t => t.matchId === event.matchId && t.url === event.url,
    // );
    // if (isOkServerStarted) {
    //   // we do nothing
    // } else {
    //   // wrong server got started, we need to kill it!
    //   this.ebus.publish(new KillServerRequestedEvent(event.url));
    // }
  }
}
