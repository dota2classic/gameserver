import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { GameServerService } from 'gameserver/gameserver.service';
import { Entities, testDbConfig } from 'util/typeorm-config';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Connection, Repository } from 'typeorm';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchEntity } from 'gameserver/model/match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { TestEnvironment } from '@test/cqrs';

// const THIS_SEASON_TIMESTAMP = new Date('2020-08-31 20:00:00.000000');
const THIS_SEASON_TIMESTAMP = new Date('2021-01-12 21:00:00.000000');
const THIS_SEASON_ID = 3;

export const randomUser = () => {
  return user(`${Math.round(Math.random() * 1000000)}`);
};

export const user = (id: string) => new PlayerId(id);

describe('GameserverService', () => {
  let module: TestingModule;
  let service: GameServerService;
  const testSubject = randomUser();

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot(testDbConfig),
        TypeOrmModule.forFeature(Entities),
      ],
      providers: [GameServerService, ...TestEnvironment()],
    }).compile();

    service = module.get(GameServerService);
  });

  beforeEach(async () => {
    const seasonRep = module.get<Repository<GameSeasonEntity>>(
      getRepositoryToken(GameSeasonEntity),
    );

    const matchRep = module.get<Repository<FinishedMatchEntity>>(getRepositoryToken(FinishedMatchEntity));

    const playerRep = module.get<Repository<PlayerInMatchEntity>>(
      getRepositoryToken(PlayerInMatchEntity),
    );

    const meRep = module.get<Repository<MatchEntity>>(
      getRepositoryToken(MatchEntity),
    );

    // seasons setup

    const gs1 = new GameSeasonEntity();
    gs1.id = 1;
    gs1.start_timestamp = new Date('2020-07-07 00:00:00.000000');
    gs1.version = Dota2Version.Dota_681;
    await seasonRep.save(gs1);

    const gs2 = new GameSeasonEntity();
    gs2.id = 2;
    gs2.start_timestamp = new Date('2020-08-31 20:00:00.000000');
    gs2.version = Dota2Version.Dota_681;
    await seasonRep.save(gs2);

    const gs3 = new GameSeasonEntity();
    gs3.id = THIS_SEASON_ID;
    gs3.start_timestamp = THIS_SEASON_TIMESTAMP;
    gs3.version = Dota2Version.Dota_681;
    await seasonRep.save(gs3);


    for (let i = 0; i < 5; i++) {
      const me = new MatchEntity();
      me.finished = true;
      me.started = true;
      me.server = '';
      me.mode = MatchmakingMode.RANKED;
      await meRep.save(me);

      const match = new FinishedMatchEntity(
        me.id,
        2,
        new Date().toISOString(),
        Dota_GameMode.RANKED_AP,
        MatchmakingMode.RANKED,
        10,
        ''
      );

      await matchRep.save(match);

      const pim = new PlayerInMatchEntity();
      pim.match = match;
      pim.playerId = testSubject.value;
      pim.abandoned = false;
      pim.denies = 0;
      pim.last_hits = 0;
      pim.kills = 0;
      pim.deaths = 0;
      pim.assists = 0;
      pim.team = 2;
      pim.level = 15;
      pim.gpm = 0;
      pim.xpm = 0;
      pim.hero = 'tmp';

      await playerRep.save(pim);
    }
  });

  afterEach(async () => {
    const connection = module.get(Connection);
    await connection.synchronize(true);
  });

  it('should be defined', async () => {});

  it('should return right season', async () => {
    const seasonRep = module.get<Repository<GameSeasonEntity>>(
      getRepositoryToken(GameSeasonEntity),
    );

    const season = await service.getCurrentSeason(Dota2Version.Dota_681);
    expect(season).toEqual({
      id: THIS_SEASON_ID,
      version: Dota2Version.Dota_681,
      start_timestamp: THIS_SEASON_TIMESTAMP,
    });
  });

  it('should return right games played for season', async () => {
    const season = await service.getCurrentSeason(Dota2Version.Dota_681);
    const gamesPlayed = await service.getGamesPlayed(
      season,
      testSubject,
      [MatchmakingMode.RANKED],
      new Date().toISOString()
    );
    expect(gamesPlayed).toEqual(5);
  });

  it('should 213', () => {
    // ProcessRankedMatchHandler.computeMMRChange(
    //   0,
    //   true,
    //
    // )
  });
});
