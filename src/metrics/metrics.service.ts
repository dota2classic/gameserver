import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';
import { Gauge, PrometheusContentType } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric("d2c_parallel_games")
    private readonly parallelGames: Gauge<string>,
    @InjectMetric("d2c_parallel_players")
    private readonly parallelPlayers: Gauge<string>,
    private readonly pushgateway: client.Pushgateway<PrometheusContentType>,
  ) {}

  public recordParallelGames(cnt: number) {
    this.parallelGames.set(cnt);
  }

  public recordParallelPlayers(cnt: number) {
    this.parallelPlayers.set(cnt);
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  private async pushMetrics() {
    await this.pushgateway.pushAdd({
      jobName: "gameserver",
    });
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  private clearMetrics() {
    this.parallelGames.reset();
    this.parallelPlayers.reset();
  }
}
