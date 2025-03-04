import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { Entities } from 'util/typeorm-config';
import { GameServerService } from 'gameserver/gameserver.service';
import { TestEnvironment } from '@test/cqrs';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { Repository } from 'typeorm';

describe.skip("GameserverService", () => {
  jest.setTimeout(60000);

  let container: StartedPostgreSqlContainer;
  let module: TestingModule;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withUsername("username")
      .withPassword("password")
      .start();

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
      providers: [GameServerService, ...TestEnvironment()],
    }).compile();
  }, 50_000);

  afterAll(async () => {
    await container.stop();
  });

  it("should spin up", () => {});

  it("should get current season", async () => {
    const gs = module.get(GameServerService);

    const repo: Repository<GameSeasonEntity> = module.get(
      getRepositoryToken(GameSeasonEntity),
    );
    const gs1 = new GameSeasonEntity();
    gs1.id = 1;
    gs1.startTimestamp = new Date("2020-07-07 00:00:00.000000");
    await repo.save(gs1);

    const gs2 = new GameSeasonEntity();
    gs2.id = 2;
    gs2.startTimestamp = new Date("2022-07-07 00:00:00.000000");
    await repo.save(gs2);

    // const season = await gs.getCurrentSeason(Dota2Version.Dota_684);
    // expect(season).toBeDefined();
    // expect(season).toEqual(gs2);
  });
});
