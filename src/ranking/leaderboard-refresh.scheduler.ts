import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MetricsService } from 'metrics/metrics.service';

@Injectable()
export class LeaderboardRefreshScheduler {
  private readonly logger = new Logger(LeaderboardRefreshScheduler.name);

  constructor(
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
    @InjectRepository(GameServerSessionEntity)
    private readonly sessionRepo: Repository<GameServerSessionEntity>,
    private readonly metrics: MetricsService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshLeaderboard() {
    await this.leaderboardViewRepository.query('refresh materialized view concurrently leaderboard_view');
    this.logger.log('Refreshed leaderboard_view');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshLeaderboardView() {
    await this.leaderboardViewRepository.query('refresh materialized view mmr_bucket_view');
    this.logger.log('Refreshed mmr_bucket_view');
    await this.leaderboardViewRepository.query('refresh materialized view item_view');
    this.logger.log('Refreshed item_view');
    await this.leaderboardViewRepository.query('refresh materialized view item_hero_view');
    this.logger.log('Refreshed item_hero_view');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async collectMetrics() {
    const sessions = await this.sessionRepo.find({});
    this.metrics.recordParallelGames(sessions.length);
    this.metrics.recordParallelPlayers(sessions.reduce((a, b) => a + b.players.length, 0));
  }
}
