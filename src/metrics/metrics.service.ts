import { Injectable } from '@nestjs/common';
import { Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric("d2c_parallel_games")
    private readonly parallelGames: Gauge<string>,
    @InjectMetric("d2c_parallel_players")
    private readonly parallelPlayers: Gauge<string>,
  ) {}

  public recordParallelGames(cnt: number) {
    this.parallelGames.set(cnt);
  }

  public recordParallelPlayers(cnt: number) {
    this.parallelPlayers.set(cnt);
  }
}
