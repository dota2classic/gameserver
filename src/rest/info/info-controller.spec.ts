import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { TestEnvironment } from '@test/cqrs';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { NestApplication } from '@nestjs/core';
import * as request from 'supertest';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { InfoController } from 'rest/info/info.controller';
import { InfoService } from 'rest/info/info.service';
import { InfoMapper } from 'rest/info/info.mapper';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { createGameMode } from '@test/values';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { UpdateGamemodeDto } from 'rest/dto/info.dto';
import { Repository } from 'typeorm';
import { Dota_Map } from 'gateway/shared-types/dota-map';

describe("InfoController", () => {
  jest.setTimeout(60000);

  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let app: NestApplication;

  let controller: InfoController;
  let mapper: InfoMapper;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withUsername("username")
      .withPassword("password")
      .start();

    const Entities = [
      MatchmakingModeMappingEntity,
      GameServerSessionEntity,
      GameServerEntity,
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
      controllers: [InfoController],
      providers: [InfoService, InfoMapper, ...TestEnvironment()],
    }).compile();

    controller = module.get(InfoController);
    mapper = module.get(InfoMapper);
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it("should spin up", () => {});

  describe("/GET /gamemode", () => {
    it(`should return list of gamemode`, async () => {
      const mode = await createGameMode(
        app,
        MatchmakingMode.UNRANKED,
        Dota_GameMode.GREEVILING,
        Dota_Map.DOTA_WINTER,
        true,
      );

      await request(app.getHttpServer())
        .get(`/info/gamemode`)
        .expect(200)
        .expect(JSON.stringify([mapper.mapMatchmakingMode(mode)]));
    });
  });

  describe("/PUT /gamemode/:mode", () => {
    it(`should update gamemode`, async () => {
      const mode = await createGameMode(
        app,
        MatchmakingMode.UNRANKED,
        Dota_GameMode.GREEVILING,
        Dota_Map.DOTA_AUTUMN,
        true,
      );

      await request(app.getHttpServer())
        .put(`/info/gamemode/${mode.lobbyType}`)
        .send({
          game_mode: Dota_GameMode.RANKED_AP,
          dota_map: Dota_Map.DOTA681,
          enabled: false,
        } satisfies UpdateGamemodeDto)
        .expect(200);

      await expect(
        app
          .get<
            any,
            Repository<MatchmakingModeMappingEntity>
          >(getRepositoryToken(MatchmakingModeMappingEntity))
          .findOneOrFail({ where: { lobbyType: mode.lobbyType } }),
      ).resolves.toEqual({
        lobbyType: MatchmakingMode.UNRANKED,
        enabled: false,
        dotaGameMode: Dota_GameMode.RANKED_AP,
        dotaMap: Dota_Map.DOTA681,
      } satisfies MatchmakingModeMappingEntity);
    });
  });
});
