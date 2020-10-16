import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameserverSaga } from 'gameserver/saga/gameserver.saga';
import { FindGameServerHandler } from 'gameserver/command/FindGameServer/find-game-server.handler';
import { UpdateGameServerHandler } from 'gameserver/command/UpdateGameServer/update-game-server.handler';
import { CreateMatchHandler } from 'gameserver/command/CreateMatch/create-match.handler';

const CommandHandlers = [
  FindGameServerHandler,
  CreateMatchHandler,
  UpdateGameServerHandler,
];
const EventHandlers = [];
const Repositories = [GameServerRepository];
const Services = [];
const Sagas = [GameserverSaga];

export const GameServerDomain = [
  ...CommandHandlers,
  ...EventHandlers,
  ...Repositories,
  ...Services,
  ...Sagas,
];
