import { Test } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { AchievementPercentileService } from 'achievement/achievement-percentile.service';

describe('AchievementPercentileService', () => {
  const distribution = [
    { achievement_key: AchievementKey.KILLS, progress: 100, cnt: 1 },
    { achievement_key: AchievementKey.KILLS, progress: 50, cnt: 2 },
    { achievement_key: AchievementKey.KILLS, progress: 10, cnt: 3 },
    { achievement_key: AchievementKey.KILLS, progress: 0, cnt: 4 },
  ];
  const playerRows = [
    { steam_id: '1', achievement_key: AchievementKey.KILLS, progress: 50, matchId: 7 },
    { steam_id: '1', achievement_key: AchievementKey.KILLS, progress: 0, matchId: null },
    { steam_id: '1', achievement_key: AchievementKey.KILLS, progress: 75, matchId: 8 },
    { steam_id: '1', achievement_key: AchievementKey.ASSISTS, progress: 5, matchId: 9 },
  ];

  const query = jest.fn((sql: string) =>
    Promise.resolve(sql.includes('GROUP BY') ? distribution : playerRows),
  );

  let service: AchievementPercentileService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        AchievementPercentileService,
        { provide: DataSource, useValue: { query } },
      ],
    }).compile();
    service = module.get(AchievementPercentileService);
  });

  it('computes percentiles from one cached distribution query', async () => {
    const [first] = await Promise.all([
      service.getPlayerAchievements('1'),
      service.getPlayerAchievements('1'),
    ]);
    await service.getPlayerAchievements('1');

    expect(first.map((it) => it.percentile)).toEqual([0.3, 0.6, 0.1, 0]);
    expect(first[1].matchId).toBeNull();
    expect(query.mock.calls.filter(([sql]) => sql.includes('GROUP BY'))).toHaveLength(1);
  });
});
