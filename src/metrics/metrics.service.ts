import { Injectable } from '@nestjs/common';
import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric("d2c_parallel_games")
    private readonly parallelGames: Gauge<string>,
    @InjectMetric("d2c_parallel_players")
    private readonly parallelPlayers: Gauge<string>,
    @InjectMetric("d2c_abandon_count")
    private readonly abandonCount: Gauge<string>,
  ) {}

  public recordParallelGames(cnt: number) {
    this.parallelGames.set(cnt);
  }

  public recordParallelPlayers(cnt: number) {
    this.parallelPlayers.set(cnt);
  }

  public recordAbandon(mode: MatchmakingMode, count: number) {
    this.abandonCount.labels(mode.toString()).set(count);
  }
}
