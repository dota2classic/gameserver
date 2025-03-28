import { PrometheusController } from '@willsoto/nestjs-prometheus';
import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiExcludeController } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

@ApiExcludeController()
@Controller()
export class PrometheusGuardedController extends PrometheusController {
  @Get()
  @UseGuards(AuthGuard("basic"))
  index(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }

  @Get("unguarded")
  index2(@Res({ passthrough: true }) response: Response) {
    return super.index(response);
  }
}
