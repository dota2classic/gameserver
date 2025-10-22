import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import configuration from './configuration';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { Entities } from 'util/typeorm-config';

export const getTypeormConfig = (
  cs: ConfigService,
): PostgresConnectionOptions => {
  return {
    type: "postgres",
    database: "postgres",

    port: cs.get<number>('postgres.port') || 5432,
    host: cs.get("postgres.host"),
    username: cs.get("postgres.username"),
    password: cs.get("postgres.password"),
    synchronize: false,
    entities: Entities,
    migrations: ["src/database/migrations/*.*"],
    migrationsRun: false,
    migrationsTableName: "gameserver_migrations",
    logging: true,

    extra: {
      max: 20, // maximum number of connections
      min: 10, // minimum number of idle connections
      idleTimeoutMillis: 30000, // close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // return an error after 2 seconds if connection could not be established
    },
  };
};

const AppDataSource = new DataSource(
  getTypeormConfig(new ConfigService(configuration())),
);

export default AppDataSource;
