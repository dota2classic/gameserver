import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { makeGaugeProvider, PrometheusModule, PrometheusUseFactoryOptions } from '@willsoto/nestjs-prometheus';
import { MetricsService } from 'metrics/metrics.service';
import { PrometheusGuardedController } from 'prometheus-guarded.controller';

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
      controller: PrometheusGuardedController
    }),
  ],
  providers: [
    MetricsService,
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
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
