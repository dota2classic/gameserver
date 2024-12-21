import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
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
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { Dota_Map } from 'gateway/shared-types/dota-map';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand>
{
  private readonly logger = new Logger(FindGameServerHandler.name);

  private pendingGamesPool: Subject<FindGameServerCommand> =
    new Subject<FindGameServerCommand>();

  constructor(
    private readonly gsSessionRepository: GameServerSessionRepository,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly qbus: QueryBus,
    @Inject("QueryCore") private readonly redisEventQueue: ClientProxy,
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
  ) {
    this.pendingGamesPool
      .pipe(asyncMap((cmd) => this.findServer(cmd), 1))
      .subscribe();
  }

  async execute(command: FindGameServerCommand) {
    this.pendingGamesPool.next(command);
  }

  private async getMapForMatchMode(mode: MatchmakingMode): Promise<Dota_Map> {
    const mapping = await this.matchmakingModeMappingEntityRepository.findOne({
      where: {
        lobbyType: mode,
      },
    });

    if (!mapping) {
      this.logger.error(
        `No mapping found for lobby type ${mode}! Returning all pick`,
      );
      return Dota_Map.DOTA;
    }
    return mapping.dotaMap;
  }

  private async getGameModeForMatchMode(
    mode: MatchmakingMode,
  ): Promise<Dota_GameMode> {
    const mapping = await this.matchmakingModeMappingEntityRepository.findOne({
      where: {
        lobbyType: mode,
      },
    });

    if (!mapping) {
      this.logger.error(
        `No mapping found for lobby type ${mode}! Returning all pick`,
      );
      return Dota_GameMode.ALLPICK;
    }
    return mapping.dotaGameMode;
  }

  private async extendMatchInfo(matchInfo: MatchInfo): Promise<GSMatchInfo> {
    const players: FullMatchPlayer[] = [];

    // TODO: i dont like it and want to move username resolving into operator
    const resolves = matchInfo.players.map(async (t) => {
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
      await this.getMapForMatchMode(matchInfo.mode),
      await this.getGameModeForMatchMode(matchInfo.mode),
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

    console.log("FindServer called, pool", freeServerPool);

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

    console.log("Free pool:", freeServerPool.length);
    while (i < freeServerPool.length) {
      const candidate = freeServerPool[i];
      const stackUrl = candidate.url;
      try {
        const cmd = new LaunchGameServerCommand(candidate.url, m.id, gsInfo);
        console.log(JSON.stringify(cmd, null, 2));
        const req = await this.redisEventQueue
          .send<
            LaunchGameServerResponse,
            LaunchGameServerCommand
          >(LaunchGameServerCommand.name, cmd)
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
        console.log("Sadkek?", e);
        console.error(e.stack);
        // timeout means server is DEAD
        this.ebus.publish(new ServerNotRespondingEvent(stackUrl));
        // just to make sure server is dead
        this.ebus.publish(new KillServerRequestedEvent(stackUrl));
      }

      i++;
    }

    console.log("So: ", inspect(foundServer));

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
