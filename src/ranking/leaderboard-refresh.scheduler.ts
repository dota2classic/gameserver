import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MetricsService } from 'metrics/metrics.service';

const LEADERBOARD_REFRESH_CRON = '30 2-59/5 * * * *';
const HOURLY_VIEWS_REFRESH_CRON = '30 4 * * * *';

const SOURCE_WRITES_QUERY = `
SELECT CASE
         WHEN count(*) = 0 OR NOT current_setting('track_counts')::boolean THEN NULL
         ELSE sum(s.n_tup_ins + s.n_tup_upd + s.n_tup_del)::text
       END AS writes
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
  private readonly refreshedAtWrites = new Map<string, string>();

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
    const writes = await this.sourceWrites(view);
    if (writes !== null && this.refreshedAtWrites.get(view) === writes) {
      return;
    }

    await this.leaderboardViewRepository.query(
      `refresh materialized view ${concurrently ? 'concurrently ' : ''}${view}`,
    );
    this.refreshedAtWrites.set(view, writes);
    this.logger.log(`Refreshed ${view}`);
  }

  private async sourceWrites(view: string): Promise<string | null> {
    try {
      const [{ writes }]: { writes: string | null }[] =
        await this.leaderboardViewRepository.query(SOURCE_WRITES_QUERY, [view]);
      return writes;
    } catch (e) {
      this.logger.error(`Could not read source table writes of ${view}`, e);
      return null;
    }
  }
}
