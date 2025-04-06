import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  makeCounterProvider,
  makeGaugeProvider,
  PrometheusModule,
  PrometheusUseFactoryOptions,
} from '@willsoto/nestjs-prometheus';
import { MetricsService } from 'metrics/metrics.service';
import { PrometheusGuardedController } from './prometheus-guarded.controller';
import { PrometheusBasicAuthStrategy } from 'metrics/prometheus-basic-auth.strategy';

@Global()
@Module({
  imports: [
    PrometheusModule.registerAsync({
      useFactory(config: ConfigService): PrometheusUseFactoryOptions {
        return {
          pushgateway: {
            url: config.get("pushgateway_url")!,
          },
          path: "/api/v1/metrics",
        };
      },
      global: true,
      imports: [],
      inject: [ConfigService],
      controller: PrometheusGuardedController
    }),
  ],
  providers: [
    MetricsService,
    PrometheusBasicAuthStrategy,
    makeGaugeProvider({
      name: "d2c_parallel_games",
      help: "123",
      labelNames: []
    }),
    makeGaugeProvider({
      name: "d2c_parallel_players",
      help: "123",
      labelNames: []
    }),
    makeCounterProvider({
      name: "d2c_abandon_count",
      help: "123",
      labelNames: ["mode"]
    }),

  ],
  exports: [MetricsService],
})
export class MetricsModule {}
