import { Injectable } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

@Injectable()
export class MetricsService {
  constructor(
    private readonly ds: DataSource,
    @InjectMetric("d2c_parallel_games")
    private readonly parallelGames: Gauge<string>,
    @InjectMetric("d2c_parallel_players")
    private readonly parallelPlayers: Gauge<string>,
    @InjectMetric("d2c_abandon_count")
    private readonly abandonCount: Gauge<string>,
    @InjectMetric("d2c_gameplay_satisfaction_metric")
    private readonly satisfactionGauge: Gauge<string>,
    @InjectMetric("d2c_not_loaded_count")
    private readonly notLoadedCount: Counter<string>,
  ) {}

  public recordNotLoaded(mode: MatchmakingMode) {
    this.notLoadedCount.labels(mode.toString()).inc();
  }

  public recordParallelGames(cnt: number) {
    this.parallelGames.set(cnt);
  }

  public recordParallelPlayers(cnt: number) {
    this.parallelPlayers.set(cnt);
  }

  public recordAbandon(mode: MatchmakingMode, count: number) {
    this.abandonCount.labels(mode.toString()).set(count);
  }

  private recordSatisfactionMetric(satisfactionLevel: number) {
    this.satisfactionGauge.set(satisfactionLevel);
  }

  // @Cron(CronExpression.EVERY_10_MINUTES)
  @Cron(CronExpression.EVERY_5_SECONDS)
  private async calculateSatisfactionMetric() {
    const satisfactions = await this.ds.query<
      { satisfaction_metric: number }[]
    >(
      `WITH abandon_ratio AS
  (SELECT fm.id,
          COUNT(pip) > 0 AS has_leaver
   FROM finished_match fm
   LEFT JOIN player_in_match pip ON pip."matchId" = fm.id
   AND pip.abandoned
   WHERE fm.timestamp > now() - interval'7 days'
     AND fm.timestamp < now()
     AND fm.matchmaking_mode = 1
   GROUP BY fm.id),
     stats AS
  (SELECT COUNT(CASE
                    WHEN has_leaver THEN 1
                END)::float / greatest(1, COUNT(*)) AS abandon_ratio,

     (SELECT AVG(duration)
      FROM finished_match fm2
      WHERE fm2.timestamp > now() - interval'7 days'
        AND fm2.timestamp < now()
        AND fm2.matchmaking_mode = 1) AS average_game_duration,

     (SELECT max(duration)
      FROM finished_match fm2
      WHERE fm2.timestamp > now() - interval'7 days'
        AND fm2.timestamp < now()
        AND fm2.matchmaking_mode = 1) AS max_game_duration,

     (SELECT min(duration)
      FROM finished_match fm2
      WHERE fm2.timestamp > now() - interval'7 days'
        AND fm2.timestamp < now()
        AND fm2.matchmaking_mode = 1) AS min_game_duration,

     (SELECT percentile_cont(0.5) within GROUP (
                                                ORDER BY duration) AS median_game_duration
      FROM finished_match fm2
      WHERE fm2.timestamp > now() - interval'7 days'
        AND fm2.timestamp < now()
        AND fm2.matchmaking_mode = 1) AS median_game_duration
   FROM abandon_ratio),
     matches AS
  (SELECT fm.id,
          abs(greatest(1, sum(pip.kills) filter(
                                                WHERE pip.team = 2))::float / greatest(1, sum(pip.kills) filter(
                                                                                                                WHERE pip.team = 3))) AS kill_ratio,
          fm.duration
   FROM finished_match fm
   INNER JOIN player_in_match pip ON pip."matchId" = fm.id
   WHERE fm.matchmaking_mode = 1
     AND fm.timestamp > now() - interval'7 days'
     AND fm.timestamp < now()
   GROUP BY fm.id),
     prom AS
  (SELECT count(*) filter(
                          WHERE (CASE
                                     WHEN m.kill_ratio < 1 THEN 1.0 / m.kill_ratio
                                     ELSE m.kill_ratio
                                 END) > 1.8
                            AND duration < 1500) AS stomped_games,
          count(*) AS total_games
   FROM matches m),
     stomps AS
  (SELECT stomped_games::float / greatest(1, total_games) AS stomp_ratio
   FROM prom),
     stats2 AS
  (SELECT 1 - abandon_ratio AS anti_abandon_ratio,
          1 - abs(median_game_duration - 2400) / greatest(1, max_game_duration - min_game_duration) AS duration_factor,
          1 - stomp_ratio AS stomp_factor
   FROM stats
   INNER JOIN stomps ON TRUE)
SELECT anti_abandon_ratio * duration_factor * stomp_factor AS satisfaction_metric
FROM stats2;`,
      [],
    );

    if (satisfactions[0].satisfaction_metric != null) {
      this.recordSatisfactionMetric(satisfactions[0].satisfaction_metric);
    }
  }

  private async recordGameSatisfaction(
    satisfactionValue: number,
    version: string,
  ) {}
}
