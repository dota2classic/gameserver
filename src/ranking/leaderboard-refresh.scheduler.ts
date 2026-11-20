import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MetricsService } from 'metrics/metrics.service';

const LEADERBOARD_REFRESH_CRON = '30 2-59/5 * * * *';
const HOURLY_VIEWS_REFRESH_CRON = '30 4 * * * *';

export const MAX_TICKS_BETWEEN_REFRESHES = 6;

const SOURCE_COUNTERS_QUERY = `
SELECT CASE
         WHEN count(*) = 0 OR NOT current_setting('track_counts')::boolean THEN NULL
         ELSE string_agg(s.relid || ':' || s.n_tup_ins || ':' || s.n_tup_upd || ':' || s.n_tup_del, ',' ORDER BY s.relid)
       END AS counters
FROM pg_stat_user_tables s
WHERE s.relid IN (
  SELECT d.refobjid
  FROM pg_rewrite r
  INNER JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = r.oid
  WHERE r.ev_class = $1::regclass
    AND d.refclassid = 'pg_class'::regclass
    AND d.refobjid <> r.ev_class
)`;

@Injectable()
export class LeaderboardRefreshScheduler {
  private readonly logger = new Logger(LeaderboardRefreshScheduler.name);
  private readonly lastRefresh = new Map<
    string,
    { counters: string | null; ticks: number }
  >();

  constructor(
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
    @InjectRepository(GameServerSessionEntity)
    private readonly sessionRepo: Repository<GameServerSessionEntity>,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(LEADERBOARD_REFRESH_CRON)
  async refreshLeaderboard() {
    await this.refreshIfSourcesChanged('leaderboard_view', true);
  }

  @Cron(HOURLY_VIEWS_REFRESH_CRON)
  async refreshLeaderboardView() {
    await this.refreshIfSourcesChanged('mmr_bucket_view', false);
    await this.refreshIfSourcesChanged('item_view', false);
    await this.refreshIfSourcesChanged('item_hero_view', false);
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectMetrics() {
    const sessions = await this.sessionRepo.find({});
    this.metrics.recordParallelGames(sessions.length);
    this.metrics.recordParallelPlayers(sessions.reduce((a, b) => a + b.players.length, 0));
  }

  private async refreshIfSourcesChanged(view: string, concurrently: boolean) {
    const counters = await this.sourceCounters(view);
    const last = this.lastRefresh.get(view);
    if (
      last &&
      counters !== null &&
      last.counters === counters &&
      last.ticks + 1 < MAX_TICKS_BETWEEN_REFRESHES
    ) {
      last.ticks++;
      return;
    }

    await this.leaderboardViewRepository.query(
      `refresh materialized view ${concurrently ? 'concurrently ' : ''}${view}`,
    );
    this.lastRefresh.set(view, { counters, ticks: 0 });
    this.logger.log(`Refreshed ${view}`);
  }

  private async sourceCounters(view: string): Promise<string | null> {
    try {
      const [{ counters }]: { counters: string | null }[] =
        await this.leaderboardViewRepository.query(SOURCE_COUNTERS_QUERY, [view]);
      return counters;
    } catch (e) {
      this.logger.error(`Could not read source table counters of ${view}`, e);
      return null;
    }
  }
}
