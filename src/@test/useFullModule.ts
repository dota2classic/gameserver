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
import { WinstonWrapper } from 'util/logger';
import { CoreController } from 'core.controller';
import { RmqController } from 'rmq.controller';
import { QueryController } from 'query.controller';
import { MatchController } from 'rest/match/match.controller';
import { PlayerController } from 'rest/player.controller';
import { InfoController } from 'rest/info/info.controller';
import { MetaController } from 'rest/meta/meta.controller';
import { CrimeController } from 'rest/crime/crime.controller';
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

    te.containers.redis = await new RedisContainer()
      .withPassword("redispass")
      .start();

    te.containers.rabbit = await new RabbitMQContainer()
      .start();

    te.queryMocks = {};

    te.module = await Test.createTestingModule({
      imports: [
        await ConfigModule.forRoot({
          isGlobal: true
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
          synchronize: true,
          dropSchema: true,
          ssl: false,
        }),
        TypeOrmModule.forFeature(Entities),
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
            name: "RMQ",
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
                  queue: 'gameserver_commands',
                  queueOptions: {
                    durable: true,
                  },
                  prefetchCount: 5,
                },
              };
            },
            inject: [],
            imports: [],
          }
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
        Mapper,
        ...GameServerDomain,
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
      ]
    }).compile();

    te.app = await te.module.createNestApplication({
      logger: new WinstonWrapper(
        'localhost',
        7777,
        true,
      ),
    });

    await te.app.listen(0)

    te.service = (con) => te.module.get(con);
    te.repo = (con) => te.module.get(getRepositoryToken(con));
    te.ebus = te.module.get(EventBus);
    te.ebusSpy = jest.spyOn(te.ebus, "publish");

    await new FantasyFunction1739896254921().up(
      te.service(DataSource).createQueryRunner(),
    );
    console.log("Created fantasy score function")

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
