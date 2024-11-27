import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestEnvironment } from '@test/cqrs';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchController } from './match.controller';
import { createFakeMatch, fillMatch } from '@test/create-fake-match';
import { MatchService } from 'rest/service/match.service';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { MatchMapper } from 'rest/match/match.mapper';
import { MatchEntity } from 'gameserver/model/match.entity';
import { NestApplication } from '@nestjs/core';
import * as request from 'supertest';

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

      await request(app.getHttpServer())
        .get(`/match/${matchId}`)
        .expect(404);
    });




    // it("should return 404 if match doesnt exist", async () => {
    //   const fm2 = await controller.getMatch(-5);
    //   expect(fm2).toBeDefined();
    //   expect(fm2).toEqual(mapper.mapMatch({ ...fm, players: pims }));
    // });
  });
});
