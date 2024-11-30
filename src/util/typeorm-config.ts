import { MatchEntity } from 'gameserver/model/match.entity';
import { DB_HOST, DB_PASSWORD, DB_USERNAME } from 'env';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { ReplayEntity } from 'gameserver/model/replay.entity';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { ItemView } from 'gameserver/model/item.view';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { AchievementEntity } from 'gameserver/model/achievement.entity';

export const Entities: Function[] = [
  GameSeasonEntity,
  VersionPlayerEntity,

  MatchEntity,
  FinishedMatchEntity,
  PlayerInMatchEntity,

  PlayerBanEntity,

  GameServerSessionEntity,
  GameServerEntity,
  PlayerCrimeLogEntity,


  MmrChangeLogEntity,
  PlayerReportStatusEntity,
  PlayerReportEntity,
  AchievementEntity,

  ReplayEntity,
  LeaderboardView,

  ItemView,
  ItemHeroView,
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
  logging: true
};

export const prodDbConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  database: 'postgres',
  host: DB_HOST(),
  port: 5432,
  username: DB_USERNAME(),
  password: DB_PASSWORD(),
  entities: Entities,
  synchronize: true,
  dropSchema: false,
  poolSize: 50,

  // maxQueryExecutionTime: 100,

  ssl: false,
};
