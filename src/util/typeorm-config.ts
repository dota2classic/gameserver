import { MatchEntity } from 'gameserver/model/match.entity';

export const Entities = [
  MatchEntity
]
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

export const testDbConfig: any = {
  type: 'sqlite',
  database: ':memory:',
  entities: Entities,
  synchronize: true,
  keepConnectionAlive: true,
};

export const prodDbConfig: any = {
  type: 'postgres',
  database: 'postgres',
  host: 'gameserver-db',
  port: 5400,
  username: 'postgres',
  password: 'tododododoood',
  entities: Entities,
  synchronize: true,

  ssl: false,
};