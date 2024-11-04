import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { ClientProxy } from '@nestjs/microservices';
import {
  FullMatchPlayer,
  GSMatchInfo,
  LaunchGameServerCommand,
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
import { MatchEntity } from 'gameserver/model/match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';

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
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
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

  private getGameModeForMatchMode(mode: MatchmakingMode): Dota_GameMode {
    switch (mode) {
      case MatchmakingMode.RANKED:
        return Dota_GameMode.RANKED_AP;
      case MatchmakingMode.UNRANKED:
        return Dota_GameMode.ALLPICK;
      case MatchmakingMode.SOLOMID:
        return Dota_GameMode.SOLOMID;
      case MatchmakingMode.DIRETIDE:
        return Dota_GameMode.DIRETIDE;
      case MatchmakingMode.GREEVILING:
        return Dota_GameMode.GREEVILING;
      case MatchmakingMode.ABILITY_DRAFT:
        return Dota_GameMode.ABILITY_DRAFT;
      case MatchmakingMode.TOURNAMENT:
        return Dota_GameMode.CAPTAINS_MODE;
      case MatchmakingMode.BOTS:
        return Dota_GameMode.ALLPICK;
      case MatchmakingMode.HIGHROOM:
        return Dota_GameMode.RANKED_AP;
      case MatchmakingMode.TOURNAMENT_SOLOMID:
        return Dota_GameMode.SOLOMID;
      case MatchmakingMode.CAPTAINS_MODE:
        return Dota_GameMode.CAPTAINS_MODE;
    }
  }

  private async extendMatchInfo(matchInfo: MatchInfo): Promise<GSMatchInfo> {
    const players: FullMatchPlayer[] = [];

    // TODO: i dont like it and want to move username resolving into operator
    const resolves = matchInfo.players.map(async t => {
      const res = await this.qbus.execute<
        GetUserInfoQuery,
        GetUserInfoQueryResult
      >(new GetUserInfoQuery(t.playerId));
      players.push(
        new FullMatchPlayer(t.playerId, t.team, res.name, t.partyId),
      );
    });

    await Promise.all(resolves);

    return new GSMatchInfo(
      matchInfo.mode,
      this.getGameModeForMatchMode(matchInfo.mode),
      matchInfo.roomId,
      players,
      matchInfo.version,
      matchInfo.averageMMR,
    );
  }

  private async findServer(command: FindGameServerCommand) {
    const freeServerPool = await this.gsSessionRepository.getAllFree(
      command.matchInfo.version,
    );

    const gsInfo = await this.extendMatchInfo(command.matchInfo);

    console.log('FindServer called, pool', freeServerPool);

    const m = new MatchEntity();
    m.server = MatchEntity.NOT_DECIDED_SERVER;
    m.mode = command.matchInfo.mode;
    m.started = false;
    m.finished = false;
    m.matchInfoJson = {
      ...gsInfo,
    };

    await this.matchEntityRepository.save(m);

    let i = 0;
    let foundServer: GameServerEntity | undefined;

    console.log('Free pool:', freeServerPool.length);
    while (i < freeServerPool.length) {
      const candidate = freeServerPool[i];
      const stackUrl = candidate.url;
      try {
        const cmd = new LaunchGameServerCommand(candidate.url, m.id, gsInfo);
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
        console.error(e.stack);
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

    const session = new GameServerSessionEntity();
    session.url = foundServer.url;

    session.matchId = m.id;
    session.matchInfoJson = {
      ...gsInfo,
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
