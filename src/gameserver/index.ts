import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameserverSaga } from 'gameserver/saga/gameserver.saga';
import { FindGameServerHandler } from 'gameserver/command/FindGameServer/find-game-server.handler';
import { UpdateGameServerHandler } from 'gameserver/command/UpdateGameServer/update-game-server.handler';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameServerStoppedHandler } from 'gameserver/event-handler/game-server-stopped.handler';
import { GameServerDiscoveredHandler } from 'gameserver/event-handler/game-server-discovered.event';
import { GameServerStartedHandler } from 'gameserver/event-handler/game-server-started.handler';
import { GameServerNotStartedHandler } from 'gameserver/event-handler/game-server-not-started.handler';
import { GameSessionFinishedHandler } from 'gameserver/event-handler/game-session-finished.handler';
import { MatchStartedHandler } from 'gameserver/event-handler/match-started.handler';
import { MatchFinishedHandler } from 'gameserver/event-handler/match-finished.handler';
import { GameResultsHandler } from 'gameserver/event-handler/game-results.handler';
import { GetSessionByUserHandler } from 'gameserver/query/get-session-by-user.handler';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';

const CommandHandlers = [
  FindGameServerHandler,
  UpdateGameServerHandler,
  ProcessRankedMatchHandler,
];
const EventHandlers = [
  GameServerStoppedHandler,
  GameServerDiscoveredHandler,
  GameServerStartedHandler,
  GameServerNotStartedHandler,
  GameSessionFinishedHandler,

  MatchStartedHandler,
  MatchFinishedHandler,

  GameResultsHandler,
];
const Repositories = [GameServerRepository, GameServerSessionRepository];
const Services = [];
const Sagas = [GameserverSaga];

export const GameServerDomain = [
  ...CommandHandlers,
  ...EventHandlers,
  ...Repositories,
  ...Services,
  ...Sagas,
  GetSessionByUserHandler,
];
