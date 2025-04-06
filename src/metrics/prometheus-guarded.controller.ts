import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrometheusBasicAuthStrategy } from 'metrics/prometheus-basic-auth.strategy';

@ApiExcludeController()
@Controller("/api/v1/metrics")
export class PrometheusGuardedController extends PrometheusController {
  @Get()
  @UseGuards(PrometheusBasicAuthStrategy)
  index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
