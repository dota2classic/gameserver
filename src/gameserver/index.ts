import { GameserverSaga } from 'gameserver/saga/gameserver.saga';
import { FindGameServerHandler } from 'gameserver/command/FindGameServer/find-game-server.handler';
import { GameServerStoppedHandler } from 'gameserver/event-handler/game-server-stopped.handler';
import { GameServerDiscoveredHandler } from 'gameserver/event-handler/game-server-discovered.event';
import { GameServerStartedHandler } from 'gameserver/event-handler/game-server-started.handler';
import { GameServerNotStartedHandler } from 'gameserver/event-handler/game-server-not-started.handler';
import { GameSessionFinishedHandler } from 'gameserver/event-handler/game-session-finished.handler';
import { MatchStartedHandler } from 'gameserver/event-handler/match-started.handler';
import { MatchFinishedHandler } from 'gameserver/event-handler/match-finished.handler';
import { GetSessionByUserHandler } from 'gameserver/query/get-session-by-user.handler';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { GetPlayerInfoHandler } from 'gameserver/query/get-player-info.handler';
import { MakeSureExistsHandler } from 'gameserver/command/MakeSureExists/make-sure-exists.handler';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerBanHammeredHandler } from 'gameserver/event-handler/player-ban-hammered.handler';
import { PlayerNotLoadedHandler } from 'gameserver/event-handler/player-not-loaded.handler';
import { CrimeLogCreatedHandler } from 'gameserver/event-handler/crime-log-created.handler';
import { PlayerDeclinedGameHandler } from 'gameserver/event-handler/player-declined-game.handler';
import { ServerNotRespondingHandler } from 'gameserver/event-handler/server-not-responding.handler';
import { GetReportsAvailableHandler } from 'gameserver/query/get-reports-available.handler';
import { PlayerReportUpdatedHandler } from 'gameserver/event-handler/player-report-updated.handler';
import { PlayerReportedHandler } from 'gameserver/event-handler/player-reported.handler';
import { LiveMatchUpdateHandler } from 'gameserver/event-handler/live-match-update.handler';
import { ServerStatusHandler } from 'gameserver/event-handler/server-status.handler';
import { ProcessAchievementsHandler } from 'gameserver/command/ProcessAchievements/process-achievements.handler';
import { AchievementService } from 'gameserver/achievement.service';
import { PrepareGameHandler } from 'gameserver/command/PrepareGame/prepare-game.handler';
import { LobbyReadyHandler } from 'gameserver/event-handler/lobby-ready.handler';
import { PlayerConnectedHandler } from 'gameserver/event-handler/player-connected.handler';
import { SaveGameResultsHandler } from 'gameserver/command/SaveGameResults/save-game-results.handler';
import { SaveMatchFailedHandler } from 'gameserver/command/SaveMatchFailed/save-match-failed.handler';
import { SavePlayerAbandonHandler } from 'gameserver/command/SavePlayerAbandon/save-player-abandon.handler';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { LeaderboardService } from 'gameserver/service/leaderboard.service';
import { PlayerReportService } from 'gameserver/service/player-report.service';
import { PlayerQualityService } from 'gameserver/service/player-quality.service';
import { AssignStartedServerHandler } from 'gameserver/command/AssignStartedServer/assign-started-server.handler';

const CommandHandlers = [
  FindGameServerHandler,
  ProcessRankedMatchHandler,
  MakeSureExistsHandler,
  ProcessAchievementsHandler,
  PrepareGameHandler,

  SaveGameResultsHandler,
  SaveMatchFailedHandler,
  SavePlayerAbandonHandler,
  AssignStartedServerHandler
];
const EventHandlers = [
  PlayerConnectedHandler,
  LiveMatchUpdateHandler,

  GameServerStoppedHandler,
  GameServerDiscoveredHandler,
  GameServerStartedHandler,
  GameServerNotStartedHandler,
  GameSessionFinishedHandler,

  MatchStartedHandler,
  MatchFinishedHandler,

  PlayerBanHammeredHandler,
  LobbyReadyHandler,

  ServerStatusHandler,
  PlayerNotLoadedHandler,
  PlayerDeclinedGameHandler,
  CrimeLogCreatedHandler,

  ServerNotRespondingHandler,
  PlayerReportUpdatedHandler,
  PlayerReportedHandler,
];

const QueryHandlers = [
  GetPlayerInfoHandler,
  GetSessionByUserHandler,
  GetReportsAvailableHandler,
];
const Repositories = [];
const Services = [
  GameServerService,
  AchievementService,
  GameSeasonService,
  PlayerServiceV2,
  LeaderboardService,
  PlayerReportService,
  PlayerQualityService
];
const Sagas = [GameserverSaga];

export const GameServerDomain = [
  ...CommandHandlers,
  ...EventHandlers,
  ...Repositories,
  ...Services,
  ...Sagas,
  ...QueryHandlers,
];
