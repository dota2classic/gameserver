import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestEnvironment } from '@test/cqrs';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchController } from './match.controller';
import { createFakeMatch, fillMatch } from '@test/create-fake-match';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { MatchMapper } from 'rest/match/match.mapper';
import { MatchEntity } from 'gameserver/model/match.entity';
import { NestApplication } from '@nestjs/core';
import * as request from 'supertest';
import { makePage } from 'gateway/util/make-page';
import { MatchService } from 'rest/match/match.service';

describe("MatchController", () => {
  jest.setTimeout(60000);

  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let app: NestApplication;

  let controller: MatchController;
  let mapper: MatchMapper;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withUsername("username")
      .withPassword("password")
      .start();

    const Entities = [
      MatchEntity,
      FinishedMatchEntity,
      PlayerInMatchEntity,
      MmrChangeLogEntity,
    ];

    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          host: container.getHost(),
          port: container.getFirstMappedPort(),

          type: "postgres",
          database: "postgres",

          username: container.getUsername(),
          password: container.getPassword(),
          entities: Entities,
          synchronize: true,
          dropSchema: false,
          ssl: false,
        }),
        TypeOrmModule.forFeature(Entities),
      ],
      controllers: [MatchController],
      providers: [MatchService, MatchMapper, ...TestEnvironment()],
    }).compile();

    controller = module.get(MatchController);
    mapper = module.get(MatchMapper);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it("should spin up", () => {});

  describe("/GET /match/:id", () => {
    it(`should return mapped match if exists`, async () => {
      const fm = await createFakeMatch(module);
      const pims = await fillMatch(module, fm, 10);

      await request(app.getHttpServer())
        .get(`/match/${fm.id}`)
        .expect(200)
        .expect(JSON.stringify(mapper.mapMatch({ ...fm, players: pims })));
    });

    it(`should return 404 and an error if match doesn't exist`, async () => {
      const matchId = -2;

      await request(app.getHttpServer()).get(`/match/${matchId}`).expect(404);
    });
  });

  describe("/GET /match/player/:id", () => {
    it(`should return matches for given player`, async () => {
      const fm = await createFakeMatch(module);
      const pims = await fillMatch(module, fm, 10);

      await request(app.getHttpServer())
        .get(`/match/player/${pims[0].playerId}`)
        .query({ page: 0 })
        .expect(200)
        .expect(
          JSON.stringify(
            await makePage(
              [mapper.mapMatch({ ...fm, players: [pims[0]] })],
              1,
              0,
              25,
              (t) => t,
            ),
          ),
        );
    });

    it(`should return empty if no matches available for player`, async () => {
      const fm = await createFakeMatch(module);
      const pims = await fillMatch(module, fm, 10);

      await request(app.getHttpServer())
        .get(`/match/player/-41234213`)
        .query({ page: 0 })
        .expect(200)
        .expect(JSON.stringify(await makePage([], 0, 0, 25, (t) => t)));
    });
  });
});
