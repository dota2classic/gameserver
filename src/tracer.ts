import { NodeSDK } from '@opentelemetry/sdk-node';
import * as process from 'process';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { JAEGER_EXPORT_URL } from './env';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const exporterOptions = {
  url: JAEGER_EXPORT_URL, // grcp
};

const traceExporter = new OTLPTraceExporter(exporterOptions);

export const otelSDK = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new NestInstrumentation(),
    new PgInstrumentation(),
  ],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'gameserver',
  }),
});

// gracefully shut down the SDK on process exit
process.on('SIGTERM', () => {
  otelSDK
    .shutdown()
    .then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    )
    .finally(() => process.exit(0));
});
