// noinspection DuplicatedCode

import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { createFakeMatch, createSeason, fillMatch } from '@test/create-fake-match';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { useFullModule } from '@test/useFullModule';
import { FantasyBucket, MmrBucketService } from 'gameserver/mmr-bucket.service';

describe("ProcessRnakedMatchHandler", () => {
  const te = useFullModule();

  beforeAll(async () => {
    await createSeason(te);
  });

  const processRanked = async (
    fm: FinishedMatchEntity,
    pims: PlayerInMatchEntity[],
  ) => {
    await te.service(ProcessRankedMatchHandler).execute(
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

  it("should spin up", () => {});

  it("should update mmr after ranked match", async () => {
    const fm = await createFakeMatch(te, DotaTeam.RADIANT);
    const pims = await fillMatch(te, fm, 10);

    await processRanked(fm, pims);

    const mmrRepo = te.repo(MmrChangeLogEntity);

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
  });

  it("should use player performance for calibration game", async () => {
    // given
    const mbs = te.service(MmrBucketService);

    // noinspection TypeScriptValidateTypes
    const getBucketSpy: jest.Mock = jest.spyOn(
      mbs,
      "getFantasyBuckets",
    ) as unknown as jest.Mock;

    // when

    const fm = await createFakeMatch(te, DotaTeam.RADIANT);
    let i = 0;
    const pims = await fillMatch(te, fm, 10, (pim) => {
      pim.kills = 2 + (10 - i);
      pim.deaths = i;
      pim.assists = 5 + (10 - i);

      pim.gpm = 500;
      pim.xpm = 500;
      pim.last_hits = 0;
      pim.denies = 0;
      pim.hero_healing = 0;
      pim.hero_damage = 0;
      pim.tower_damage = 0;
      i++;
    });

    getBucketSpy.mockImplementation(async (): Promise<FantasyBucket[]> => {
      return [
        {
          maxMmr: 1000,
          fantasy: 1,
        },
        {
          maxMmr: 1500,
          fantasy: 1.2,
        },
        {
          maxMmr: 2000,
          fantasy: 1.5,
        },
        {
          maxMmr: 2500,
          fantasy: 1.8,
        },
        {
          maxMmr: 3000,
          fantasy: 2.5,
        },
        {
          maxMmr: 3500,
          fantasy: 3,
        },
        {
          maxMmr: 4000,
          fantasy: 3.7,
        },
        {
          maxMmr: 4500,
          fantasy: 4.6,
        },
      ];
    });

    await processRanked(fm, pims);
    // then

    const mmrRepo = te.repo<MmrChangeLogEntity>(MmrChangeLogEntity);
    const changes = await mmrRepo.find({ where: { matchId: fm.id } });

    const baselineChange = 100;
    for (let change of changes) {
      if (change.winner) {
        if (change.playerPerformanceCoefficient > 1) {
          // We expect to receive more than 100 mmr
          expect(change.change).toBeGreaterThan(baselineChange);
        } else if (change.playerPerformanceCoefficient < 1) {
          expect(change.change).toBeLessThan(baselineChange);
        } else {
          expect(change.change).toEqual(baselineChange);
        }
      } else {
        if (change.playerPerformanceCoefficient > 1) {
          // We expect to receive more than 100 mmr
          expect(change.change).toBeGreaterThan(-baselineChange);
        } else if (change.playerPerformanceCoefficient < 1) {
          expect(change.change).toBeLessThan(-baselineChange);
        } else {
          expect(change.change).toEqual(-baselineChange);
        }
      }
    }
  });

  it("should always subtract mmr for leavers", async () => {
    const fm = await createFakeMatch(te, DotaTeam.RADIANT);
    const pims = await fillMatch(te, fm, 10);

    const pimRep = te.repo(PlayerInMatchEntity);
    pims[3].abandoned = true;
    pims[7].abandoned = true;
    await pimRep.save(pims);

    await processRanked(fm, pims);

    const mmrRepo = te.repo(MmrChangeLogEntity);
    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(10);

    for (let change of changes) {
      const pim = pims.find((pim) => pim.playerId === change.playerId);
      console.log("Amogus!", change, pim);
      if (pim?.abandoned) {
        expect(change.change).toBeLessThanOrEqual(0);
      } else if (pim.team === DotaTeam.RADIANT) {
        expect(change.change).toBeGreaterThanOrEqual(0);
      } else {
        expect(change.change).toBeLessThanOrEqual(0);
      }
    }
  });

  it("should not update mmr for already processed match", async () => {
    const fm = await createFakeMatch(te, DotaTeam.RADIANT);
    const pims = await fillMatch(te, fm, 10);

    await processRanked(fm, pims);

    const mmrRepo: Repository<MmrChangeLogEntity> = te.repo(MmrChangeLogEntity);

    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(10);

    // When
    await processRanked(fm, pims);

    // Then
    expect(await mmrRepo.find({ where: { matchId: fm.id } })).toHaveLength(10);
  });

  it("should not process bot match", async () => {
    const fm = await createFakeMatch(
      te,
      DotaTeam.RADIANT,
      MatchmakingMode.BOTS,
    );
    const pims = await fillMatch(te, fm, 10);
    await processRanked(fm, pims);

    const mmrRepo = te.repo(MmrChangeLogEntity);

    const changes = await mmrRepo.find({ where: { matchId: fm.id } });
    expect(changes).toHaveLength(0);
  });
});
