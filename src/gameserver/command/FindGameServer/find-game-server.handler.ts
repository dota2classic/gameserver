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
import {
  GSMatchInfo,
  LaunchGameServerCommand,
  MatchPlayer,
} from 'gateway/commands/LaunchGameServer/launch-game-server.command';
import { LaunchGameServerResponse } from 'gateway/commands/LaunchGameServer/launch-game-server.response';
import { timeout } from 'rxjs/operators';
import { ServerNotRespondingEvent } from 'gameserver/event/server-not-responding.event';
import { MatchCancelledEvent } from 'gateway/events/match-cancelled.event';
import { inspect } from 'util';
import { Subject } from 'rxjs';
import { asyncMap } from 'rxjs-async-map';
import { KillServerRequestedEvent } from 'gateway/events/gs/kill-server-requested.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { GameServerInfo } from 'gateway/shared-types/game-server-info';
import { MatchInfo } from 'gateway/events/room-ready.event';
import { GetUserInfoQuery } from 'gateway/queries/GetUserInfo/get-user-info.query';
import { GetUserInfoQueryResult } from 'gateway/queries/GetUserInfo/get-user-info-query.result';
import { DotaTeam } from 'gateway/shared-types/dota-team';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand> {
  private readonly logger = new Logger(FindGameServerHandler.name);

  private pendingGamesPool: Subject<FindGameServerCommand> = new Subject<
    FindGameServerCommand
  >();

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
  ) {
    this.pendingGamesPool
      .pipe(asyncMap(cmd => this.findServer(cmd), 1))
      .subscribe();
  }

  async execute(command: FindGameServerCommand) {
    this.pendingGamesPool.next(command);
  }

  private async extendMatchInfo(matchInfo: MatchInfo): Promise<GSMatchInfo> {
    const players: MatchPlayer[] = [];

    const rQueries = matchInfo.radiant.map(async t => {
      const res = await this.qbus.execute<
        GetUserInfoQuery,
        GetUserInfoQueryResult
      >(new GetUserInfoQuery(t));

      players.push(new MatchPlayer(t, res.name, DotaTeam.RADIANT));
    });
    const dQueries = matchInfo.dire.map(async t => {
      const res = await this.qbus.execute<
        GetUserInfoQuery,
        GetUserInfoQueryResult
      >(new GetUserInfoQuery(t));

      players.push(new MatchPlayer(t, res.name, DotaTeam.DIRE));
    });

    await Promise.all(rQueries.concat(...dQueries));

    return new GSMatchInfo(
      matchInfo.mode,
      matchInfo.roomId,
      players,
      matchInfo.version,

      matchInfo.radiant,
      matchInfo.dire,
      matchInfo.averageMMR,
    );
  }

  private async findServer(command: FindGameServerCommand) {
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

    console.log('Free pool:', freeServerPool.length);
    while (i < freeServerPool.length) {
      const candidate = freeServerPool[i];
      const stackUrl = candidate.url;
      try {
        const cmd = new LaunchGameServerCommand(
          candidate.url,
          m.id,
          await this.extendMatchInfo(command.matchInfo),
        );
        console.log(JSON.stringify(cmd, null, 2));
        const req = await this.redisEventQueue
          .send<LaunchGameServerResponse, LaunchGameServerCommand>(
            LaunchGameServerCommand.name,
            cmd,
          )
          .pipe(timeout(15000))
          .toPromise();

        // we got req, now need to deci
        if (req.successful) {
          // server launcher
          foundServer = candidate;
          break;
        } else {
          console.log(req);
          // server not launched for some reason
          // i guess we skip? just try next server
        }
      } catch (e) {
        console.log('Sadkek?', e);
        // timeout means server is DEAD
        this.ebus.publish(new ServerNotRespondingEvent(stackUrl));
        // just to make sure server is dead
        this.ebus.publish(new KillServerRequestedEvent(stackUrl));
      }

      i++;
    }

    console.log('So: ', inspect(foundServer));

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
    session.matchInfoJson = {
      ...command.matchInfo,
      // Obsolete
      players: command.matchInfo.dire
        .concat(...command.matchInfo.radiant)
        .map(it => ({
          name: '',
          playerId: it,
          team: DotaTeam.RADIANT,
        })),
    };

    await this.gameServerSessionModelRepository.save(session);

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
