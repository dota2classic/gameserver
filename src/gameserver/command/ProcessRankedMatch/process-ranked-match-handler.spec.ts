// noinspection DuplicatedCode

import { Test, TestingModule } from '@nestjs/testing';
import { TestEnvironment } from '@test/cqrs';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { createFakeMatch, fillMatch } from '@test/create-fake-match';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { NestApplication } from '@nestjs/core';
import { typeorm } from '@test/testcontainers';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { GameServerService } from 'gameserver/gameserver.service';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchEntity } from 'gameserver/model/match.entity';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

describe("MatchController", () => {
  jest.setTimeout(60000);

  let container: StartedPostgreSqlContainer;
  let module: TestingModule;
  let app: NestApplication;

  let gsServiceMock = {
    getCurrentSeason() {
      const season = new GameSeasonEntity();
      season.start_timestamp = new Date("2020-07-07 00:00:00.000000");
      season.id = 1;
      season.version = Dota2Version.Dota_684;
      return Promise.resolve(season);
    },
    getGamesPlayed: jest.fn(
      (
        season: GameSeasonEntity,
        pid: PlayerId,
        modes: MatchmakingMode[] | undefined,
        beforeTimestamp: string,
      ) => 100,
    ),
  };

  const processRanked = async (
    fm: FinishedMatchEntity,
    pims: PlayerInMatchEntity[],
  ) => {
    await app.get(ProcessRankedMatchHandler).execute(
      new ProcessRankedMatchCommand(
        fm.id,
        pims
          .filter((t) => t.team === DotaTeam.RADIANT)
          .map((it) => new PlayerId(it.playerId)),
        pims
          .filter((t) => t.team === DotaTeam.DIRE)
          .map((it) => new PlayerId(it.playerId)),
        fm.matchmaking_mode,
      ),
    );
  };

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withUsername("username")
      .withPassword("password")
      .start();

    const Entities = [
      VersionPlayerEntity,
      MatchEntity,
      FinishedMatchEntity,
      MmrChangeLogEntity,
      PlayerInMatchEntity,
    ];

    module = await Test.createTestingModule({
      imports: [...typeorm(container, Entities)],
      controllers: [],
      providers: [
        ProcessRankedMatchHandler,
        ...TestEnvironment(),
        {
          provide: GameServerService,
          useValue: gsServiceMock,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    await container.stop();
  });

  it("should spin up", () => {});

  it("should update mmr after ranked match", async () => {
    const fm = await createFakeMatch(module, DotaTeam.RADIANT);
    const pims = await fillMatch(module, fm, 10);

    gsServiceMock.getGamesPlayed = jest.fn(
      (
        season: GameSeasonEntity,
        pid: PlayerId,
        modes: MatchmakingMode[] | undefined,
        beforeTimestamp: string,
      ) => {
        if (pims.findIndex((t) => t.playerId === pid.value) % 2 === 0) return 0;
        else return 100;
      },
    );

    await processRanked(fm, pims);

    const mmrRepo: Repository<MmrChangeLogEntity> = app.get(
      getRepositoryToken(MmrChangeLogEntity),
    );
    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(10);

    changes.forEach((change) => {
      expect(change.mmrBefore).toEqual(VersionPlayerEntity.STARTING_MMR);
    });

    changes
      .filter((t) => t.winner)
      .forEach((winner) => {
        expect(winner.change).toBeGreaterThan(0);
      });

    changes
      .filter((t) => !t.winner)
      .forEach((loser) => {
        expect(loser.change).toBeLessThan(0);
      });

    const calib = changes.find((t) => t.playerId === pims[0].playerId);
    expect(calib.change).toBeGreaterThan(90);

    const nonCalib = changes.find((t) => t.playerId === pims[1].playerId);

    expect(nonCalib.change).toBeGreaterThan(10);
    expect(nonCalib.change).toBeLessThan(50);
  });

  it("should always subtract mmr for leavers", async () => {
    const fm = await createFakeMatch(module, DotaTeam.RADIANT);
    const pims = await fillMatch(module, fm, 10);

    const pimRep = module.get(getRepositoryToken(PlayerInMatchEntity));
    pims[3].abandoned = true;
    pims[7].abandoned = true;
    pimRep.save(pims);

    gsServiceMock.getGamesPlayed = jest.fn(
      (
        season: GameSeasonEntity,
        pid: PlayerId,
        modes: MatchmakingMode[] | undefined,
        beforeTimestamp: string,
      ) => {
        return 100;
      },
    );

    await processRanked(fm, pims);

    const mmrRepo: Repository<MmrChangeLogEntity> = app.get(
      getRepositoryToken(MmrChangeLogEntity),
    );
    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(10);

    for (let change of changes) {
      const pim = pims.find((pim) => pim.playerId === change.playerId);
      console.log("Amogus!", change, pim)
      if (pim?.abandoned) {
        expect(change.change).toBeLessThan(0);
      } else if (pim.team === DotaTeam.RADIANT) {
        expect(change.change).toBeGreaterThan(0);
      } else {
        expect(change.change).toBeLessThan(0);
      }
    }
  });

  it("should not update mmr for already processed match", async () => {
    const fm = await createFakeMatch(module, DotaTeam.RADIANT);
    const pims = await fillMatch(module, fm, 10);

    await processRanked(fm, pims);

    const mmrRepo: Repository<MmrChangeLogEntity> = app.get(
      getRepositoryToken(MmrChangeLogEntity),
    );

    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(10);

    // When
    await processRanked(fm, pims);

    // Then
    expect(await mmrRepo.find({ where: { matchId: fm.id } })).toHaveLength(10);
  });

  it("should not process bot match", async () => {
    const fm = await createFakeMatch(
      module,
      DotaTeam.RADIANT,
      MatchmakingMode.BOTS,
    );
    const pims = await fillMatch(module, fm, 10);
    await processRanked(fm, pims);

    const mmrRepo: Repository<MmrChangeLogEntity> = app.get(
      getRepositoryToken(MmrChangeLogEntity),
    );

    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(0);
  });
});
