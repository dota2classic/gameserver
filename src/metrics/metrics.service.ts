import { Injectable } from '@nestjs/common';
import { Counter, Gauge } from 'prom-client';
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
}
