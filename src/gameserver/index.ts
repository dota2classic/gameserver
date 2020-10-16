import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameserverSaga } from 'gameserver/saga/gameserver.saga';
import { FindGameServerHandler } from 'gameserver/command/FindGameServer/find-game-server.handler';
import { UpdateGameServerHandler } from 'gameserver/command/UpdateGameServer/update-game-server.handler';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameServerStoppedHandler } from 'gameserver/event-handler/game-server-stopped.handler';

const CommandHandlers = [FindGameServerHandler, UpdateGameServerHandler];
const EventHandlers = [
  GameServerStoppedHandler
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
];
