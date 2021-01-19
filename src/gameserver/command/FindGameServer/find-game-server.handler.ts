import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import { Repository } from 'typeorm';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { ClientProxy } from '@nestjs/microservices';
import { LaunchGameServerCommand } from 'gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerResponse } from 'gateway/commands/LaunchGameServer/launch-game-server.response';
import { timeout } from 'rxjs/operators';
import { ServerNotRespondingEvent } from 'gameserver/event/server-not-responding.event';
import { MatchCancelledEvent } from 'gateway/events/match-cancelled.event';
import { inspect } from 'util';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand> {
  private readonly logger = new Logger(FindGameServerHandler.name);

  constructor(
    private readonly gsRepository: GameServerRepository,
    private readonly gsSessionRepository: GameServerSessionRepository,
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
    >,
    private readonly ebus: EventBus,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly qbus: QueryBus,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
  ) {}

  async execute(command: FindGameServerCommand) {
    const freeServerPool = await this.gsSessionRepository.getAllFree(
      command.matchInfo.version,
    );

    const m = new MatchEntity();
    m.server = MatchEntity.NOT_DECIDED_SERVER;
    m.mode = command.matchInfo.mode;
    m.started = false;
    m.finished = false;

    await this.matchEntityRepository.save(m);

    let i = 0;
    let foundServer: GameServerModel | undefined;

    console.log("Free pool:", freeServerPool.length)
    while (i < freeServerPool.length) {
      const candidate = freeServerPool[i];
      const stackUrl = candidate.url;
      try {
        const req = await this.redisEventQueue
          .send<LaunchGameServerResponse, LaunchGameServerCommand>(
            LaunchGameServerCommand.name,
            new LaunchGameServerCommand(candidate.url, m.id, command.matchInfo),
          )
          .pipe(timeout(5000))
          .toPromise();

        // we got req, now need to deci
        if (req.successful) {
          // server launcher
          foundServer = candidate;
          break;
        } else {
          console.log(req)
          // server not launched for some reason
          // i guess we skip? just try next server
        }
      } catch (e) {
        console.log("Sadkek?", e)
        // timeout means server is DEAD
        this.ebus.publish(new ServerNotRespondingEvent(stackUrl));
      }

      i++;
    }

    console.log("So: ", inspect(foundServer))

    if (foundServer) {
      m.server = foundServer.url;
      await this.matchEntityRepository.save(m);
    } else {
      // cancel match : no servers free :sadkek:
      this.ebus.publish(new MatchCancelledEvent(m.id, command.matchInfo));
      return;
    }
    // ok here we launch server

    const session = new GameServerSessionModel();
    session.url = foundServer.url;

    session.matchId = m.id;
    session.matchInfoJson = command.matchInfo;

    await this.gameServerSessionModelRepository.save(session);

    this.ebus.publish(
      new GameSessionCreatedEvent(
        session.url,
        session.matchId,
        session.matchInfoJson,
      ),
    );
  }
}
