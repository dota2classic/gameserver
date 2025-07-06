import { Test, TestingModule } from '@nestjs/testing';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { Constructor, CqrsModule, EventBus } from '@nestjs/cqrs';
import { DataSource, ObjectLiteral, Repository } from 'typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { Entities } from 'util/typeorm-config';
import { ClientsModule, RedisOptions, RmqOptions, Transport } from '@nestjs/microservices';
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import { FantasyFunction1739896254921 } from 'database/migrations/1739896254921-FantasyFunction';
import { AppService } from 'app.service';
import { MetaService } from 'rest/meta/meta.service';
import { MatchService } from 'rest/match/match.service';
import { PlayerService } from 'rest/service/player.service';
import { MatchMapper } from 'rest/match/match.mapper';
import { MetaMapper } from 'rest/meta/meta.mapper';
import { InfoMapper } from 'rest/info/info.mapper';
import { InfoService } from 'rest/info/info.service';
import { MmrBucketService } from 'gameserver/mmr-bucket.service';
import { Mapper } from 'rest/mapper';
import { GameServerDomain } from 'gameserver';
import { ConfigModule } from '@nestjs/config';
import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import { CoreController } from 'core.controller';
import { RmqController } from 'rmq.controller';
import { QueryController } from 'query.controller';
import { MatchController } from 'rest/match/match.controller';
import { PlayerController } from 'rest/player.controller';
import { InfoController } from 'rest/info/info.controller';
import { MetaController } from 'rest/meta/meta.controller';
import { CrimeController } from 'rest/crime/crime.controller';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { MetricsService } from 'metrics/metrics.service';
import { WinstonWrapper } from '@dota2classic/nest_logger';
import { DodgeService } from 'rest/service/dodge.service';
import { CacheModule } from '@nestjs/cache-manager';
import { StartingMmrService } from 'gameserver/service/starting-mmr.service';
import { MockStartingMmrService } from '@test/MockStartingMmrService';
import { ForumApi } from 'generated-api/forum';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import SpyInstance = jest.SpyInstance;

export interface TestEnvironment {
  module: TestingModule;
  app: INestApplication;
  containers: {
    pg: StartedPostgreSqlContainer;
    redis: StartedRedisContainer;
    rabbit: StartedRabbitMQContainer;
  };
  ebus: EventBus;
  ebusSpy: SpyInstance;
  queryMocks: Record<string, jest.Mock>;

  service<R>(c: Constructor<R>): R;

  repo<R extends ObjectLiteral>(c: EntityClassOrSchema): Repository<R>;
}

export function useFullModule(): TestEnvironment {
  jest.setTimeout(120_000);

  const te: TestEnvironment = {
    module: undefined as unknown as any,
    containers: {} as unknown as any,
    ebus: {} as unknown as any,
    ebusSpy: {} as unknown as any,
    app: {} as unknown as any,
    service: {} as unknown as any,
    repo: {} as unknown as any,

    queryMocks: {},
  };

  afterEach(() => {
    te.ebusSpy.mockReset();
  });

  beforeAll(async () => {
    te.containers.pg = await new PostgreSqlContainer()
      .withUsername("username")
      .withPassword("password")
      .start();

    //     const client = new pg.Client(te.containers.pg.getConnectionUri());
    //     await client.connect();
    //     await client.query(`
    //         create or replace
    //         function fantasy_score(pim player_in_match) returns numeric
    // language plpgsql
    // as
    // $$
    // begin
    // return pim.kills * 0.3 + pim.deaths * -0.3 + pim.assists * 0.2 + pim.last_hits * 0.003 + pim.denies * 0.005 + pim.gpm * 0.002 + pim.xpm * 0.002 + pim.hero_healing * 0.01 + pim.hero_damage * 0.003 + pim.tower_damage * 0.01;
    // end;
    // $$;`);
    //     await client.end()

    te.containers.redis = await new RedisContainer()
      .withPassword("redispass")
      .start();

    te.containers.rabbit = await new RabbitMQContainer('rabbitmq:management')
      .withEnvironment({
        RABBITMQ_USER: "guest",
        RABBITMQ_PASSWORD: "guest"
      })
      .start();

    te.queryMocks = {};

    te.module = await Test.createTestingModule({
      imports: [
        await ConfigModule.forRoot({
          isGlobal: true,
        }),
        CacheModule.register({
          isGlobal: true,
        }),
        CqrsModule.forRoot(),
        TypeOrmModule.forRoot({
          host: te.containers.pg.getHost(),
          port: te.containers.pg.getFirstMappedPort(),

          type: "postgres",
          database: "postgres",
          // logging: true,

          username: te.containers.pg.getUsername(),
          password: te.containers.pg.getPassword(),
          entities: Entities,
          migrations: ["dist/src/database/migrations/*.*"],
          migrationsRun: true,
          ssl: false,
        }),
        TypeOrmModule.forFeature(Entities),
        RabbitMQModule.forRootAsync({
          useFactory(): RabbitMQConfig {
            return {
              exchanges: [
                {
                  name: "gameserver_exchange",
                  type: "topic",
                },
              ],
              uri: te.containers.rabbit.getAmqpUrl()
            };
          },
          imports: [],
          inject: [],
        }),
        ClientsModule.registerAsync([
          {
            name: "QueryCore",
            useFactory(): RedisOptions {
              return {
                transport: Transport.REDIS,
                options: {
                  port: te.containers.redis.getPort(),
                  host: te.containers.redis.getHost(),
                  password: te.containers.redis.getPassword(),
                },
              };
            },
            inject: [],
            imports: [],
          },
          {
            name: "GSCommands",
            useFactory(): RmqOptions {
              return {
                transport: Transport.RMQ,
                options: {
                  urls: [
                    {
                      hostname: te.containers.rabbit.getHost(),
                      port: te.containers.rabbit.getFirstMappedPort(),
                      protocol: "amqp",
                      // username: te.containers.rabbit.getName(),
                      // password: te.containers.rabbit.pas(),
                    },
                  ],
                  queue: "gameserver_commands",
                  queueOptions: {
                    durable: true,
                  },
                  prefetchCount: 5,
                },
              };
            },
            inject: [],
            imports: [],
          },
          {
            name: "GSEvents",
            useFactory(): RmqOptions {
              return {
                transport: Transport.RMQ,
                options: {
                  urls: [
                    {
                      hostname: te.containers.rabbit.getHost(),
                      port: te.containers.rabbit.getFirstMappedPort(),
                      protocol: "amqp",
                      // username: te.containers.rabbit.getName(),
                      // password: te.containers.rabbit.get(),
                    },
                  ],
                  queue: "gameserver_events",
                  queueOptions: {
                    durable: true,
                  },
                  prefetchCount: 5,
                },
              };
            },
            inject: [],
            imports: [],
          },
        ]),
      ],
      providers: [
        AppService,
        MetaService,
        MatchService,
        PlayerService,
        MatchMapper,
        MetaMapper,
        InfoMapper,
        InfoService,
        MmrBucketService,
        DodgeService,
        Mapper,
        ...GameServerDomain,
        {
          provide: ForumApi,
          useValue: jest.fn(),
        },
        {
          provide: StartingMmrService,
          useClass: MockStartingMmrService,
        },
        {
          provide: MetricsService,
          useValue: jest.fn(),
        },
      ],
      controllers: [
        CoreController,
        RmqController,
        QueryController,
        MatchController,
        PlayerController,
        InfoController,
        MetaController,
        CrimeController,
      ],
    }).compile();

    te.app = await te.module.createNestApplication({
      logger: new WinstonWrapper("localhost", 7777, "demo", true),
    });

    await te.app.listen(0);

    te.service = (con) => te.module.get(con);
    te.repo = (con) => te.module.get(getRepositoryToken(con));
    te.ebus = te.module.get(EventBus);
    te.ebusSpy = jest.spyOn(te.ebus, "publish");

    await new FantasyFunction1739896254921().up(
      te.service(DataSource).createQueryRunner(),
    );
    console.log("Created fantasy score function");

    const gs = await te.repo<GameSeasonEntity>(GameSeasonEntity);
    await gs.save({
      id: 1,
      startTimestamp: new Date(2000, 1, 1),
    });

    // Mocks:
  });

  afterAll(async () => {
    await te.app.close();
    await te.containers.pg.stop();
    await te.containers.redis.stop();
  });

  return te;
}

export function testUser(): string {
  return Math.round(Math.random() * 1000000).toString();
}

export async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
