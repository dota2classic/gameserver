import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { DataSource } from 'typeorm';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { DBAchievementDto } from 'rest/dto/achievement.dto';

interface ProgressDistribution {
  total: number;
  unlocked: number;
  progressDesc: number[];
  atLeast: number[];
}

type PercentileTable = Partial<Record<AchievementKey, ProgressDistribution>>;

@Injectable()
export class AchievementPercentileService {
  private static readonly CACHE_KEY = 'ach_pct';
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getPlayerAchievements(steamId: string): Promise<DBAchievementDto[]> {
    const [table, achievements] = await Promise.all([
      this.cacheManager.wrap(
        AchievementPercentileService.CACHE_KEY,
        () => this.loadTable(),
        AchievementPercentileService.CACHE_TTL_MS,
      ),
      this.ds.query<Omit<DBAchievementDto, 'percentile'>[]>(
        `SELECT steam_id, achievement_key, progress, "matchId" FROM achievement_entity WHERE steam_id = $1`,
        [steamId],
      ),
    ]);

    return achievements.map((it) => ({
      ...it,
      percentile: this.percentile(table[it.achievement_key], it.progress),
    }));
  }

  private percentile(distribution: ProgressDistribution | undefined, progress: number): number {
    if (!distribution) return 0;
    if (progress <= 0) return distribution.unlocked / distribution.total;

    let lo = 0;
    let hi = distribution.progressDesc.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (distribution.progressDesc[mid] >= progress) lo = mid + 1;
      else hi = mid;
    }
    return lo === 0 ? 0 : distribution.atLeast[lo - 1] / distribution.total;
  }

  private async loadTable(): Promise<PercentileTable> {
    const rows = await this.ds.query<
      { achievement_key: AchievementKey; progress: number; cnt: number }[]
    >(
      `SELECT achievement_key, progress, COUNT(*)::int AS cnt
       FROM achievement_entity
       GROUP BY achievement_key, progress
       ORDER BY achievement_key, progress DESC`,
    );

    const table: PercentileTable = {};
    for (const row of rows) {
      const distribution = (table[row.achievement_key] ??= {
        total: 0,
        unlocked: 0,
        progressDesc: [],
        atLeast: [],
      });
      distribution.total += row.cnt;
      if (row.progress > 0) distribution.unlocked += row.cnt;
      distribution.progressDesc.push(row.progress);
      distribution.atLeast.push(distribution.total);
    }
    return table;
  }
}
