import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  makeCounterProvider,
  makeGaugeProvider,
  PrometheusModule,
  PrometheusUseFactoryOptions,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from 'metrics/metrics.service';

@Global()
@Module({
  imports: [
    PrometheusModule.registerAsync({
      useFactory(config: ConfigService): PrometheusUseFactoryOptions {
        return {
          pushgateway: {
            url: config.get("pushgateway_url")!,
          },
        };
      },
      global: true,
      imports: [],
      inject: [ConfigService],
    }),
  ],
  providers: [
    MetricsService,
    makeGaugeProvider({
      name: "d2c_parallel_games",
      help: "123",
      labelNames: [],
    }),
    makeGaugeProvider({
      name: "d2c_parallel_players",
      help: "123",
      labelNames: [],
    }),
    makeGaugeProvider({
      name: "d2c_abandon_count",
      help: "123",
      labelNames: ["mode"],
    }),
    makeGaugeProvider({
      name: "d2c_gameplay_satisfaction_metric",
      help: "Gameplay satisfaction",
      labelNames: [],
    }),
    makeCounterProvider({
      name: "d2c_not_loaded_count",
      help: "Counter of not player not loaded events",
      labelNames: ["mode"],
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
