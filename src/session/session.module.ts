import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GameServerSessionEntity } from "gameserver/model/game-server-session.entity";
import { GameSessionPlayerEntity } from "gameserver/model/game-session-player.entity";
import { MatchEntity } from "gameserver/model/match.entity";
import { MatchmakingModeMappingEntity } from "gameserver/model/matchmaking-mode-mapping.entity";
import { PlayerIpEntity } from "gameserver/model/player-ip.entity";
import FinishedMatchEntity from "gameserver/model/finished-match.entity";
import { GameSessionService } from "gameserver/service/game-session.service";
import { PrepareGameHandler } from "gameserver/command/PrepareGame/prepare-game.handler";
import { FindGameServerHandler } from "gameserver/command/FindGameServer/find-game-server.handler";
import { AssignStartedServerHandler } from "gameserver/command/AssignStartedServer/assign-started-server.handler";
import { LeaveGameSessionHandler } from "gameserver/command/LeaveGameSessionCommand/leave-game-session.handler";
import { GameServerStartedHandler } from "gameserver/event-handler/game-server-started.handler";
import { SessionEndedHandler } from "gameserver/event-handler/session-ended.handler";
import { GameServerNotStartedHandler } from "gameserver/event-handler/game-server-not-started.handler";
import { GameSessionCreatedHandler } from "gameserver/event-handler/game-session-created.handler";
import { PlayerConnectedHandler } from "gameserver/event-handler/player-connected.handler";
import { LiveMatchUpdateHandler } from "gameserver/event-handler/live-match-update.handler";
import { ServerStatusHandler } from "gameserver/event-handler/server-status.handler";
import { MatchStartedHandler } from "gameserver/event-handler/match-started.handler";
import { GetSessionByUserHandler } from "gameserver/query/get-session-by-user.handler";
import { PlayerSessionController } from "./player-session.controller";
import { SessionRedisListener } from "./session-redis.listener";
import { SessionRmqListener } from "./session-rmq.listener";
import { SessionQueryController } from "./session-query.controller";
import { ModerationModule } from "moderation/moderation.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameServerSessionEntity,
      GameSessionPlayerEntity,
      MatchEntity,
      MatchmakingModeMappingEntity,
      PlayerIpEntity,
      FinishedMatchEntity,
    ]),
    ModerationModule,
  ],
  controllers: [
    PlayerSessionController,
    SessionRedisListener,
    SessionRmqListener,
    SessionQueryController,
  ],
  providers: [
    GameSessionService,
    PrepareGameHandler,
    FindGameServerHandler,
    AssignStartedServerHandler,
    LeaveGameSessionHandler,
    GameServerStartedHandler,
    SessionEndedHandler,
    GameServerNotStartedHandler,
    GameSessionCreatedHandler,
    PlayerConnectedHandler,
    LiveMatchUpdateHandler,
    ServerStatusHandler,
    MatchStartedHandler,
    GetSessionByUserHandler,
  ],
  exports: [GameSessionService, GetSessionByUserHandler],
})
export class SessionModule {}
