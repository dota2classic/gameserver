import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerStartedEvent } from 'gateway/events/game-server-started.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { GameServerInfo } from 'gateway/shared-types/game-server-info';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KillServerRequestedEvent } from 'gateway/events/gs/kill-server-requested.event';

@EventsHandler(GameServerStartedEvent)
export class GameServerStartedHandler
  implements IEventHandler<GameServerStartedEvent> {
  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
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
