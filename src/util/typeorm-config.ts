import { MatchEntity } from 'gameserver/model/match.entity';
import { DB_HOST, DB_PASSWORD, DB_USERNAME } from 'env';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import Match from 'gameserver/entity/Match';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';

export const Entities = [
  GameSeason,
  VersionPlayer,

  MatchEntity,
  Match,
  PlayerInMatch,

  PlayerBan,

  GameServerSessionModel
];
export const devDbConfig: any = {
  type: 'postgres',
  database: 'postgres',
  host: 'localhost',
  port: 5400,
  username: 'postgres',
  password: 'docker',
  entities: Entities,
  synchronize: true,

  keepConnectionAlive: true,
};

export const testDbConfig: TypeOrmModuleOptions = {
  type: 'sqlite',
  database: ':memory:',
  entities: Entities,
  synchronize: true,
  keepConnectionAlive: true,
  dropSchema: true,
};

export const prodDbConfig: any = {
  type: 'postgres',
  database: 'postgres',
  host: DB_HOST(),
  port: 5432,
  username: DB_USERNAME(),
  password: DB_PASSWORD,
  entities: Entities,
  synchronize: true,

  ssl: false,
};
