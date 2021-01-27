import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetaService } from 'rest/service/meta.service';

@Controller('meta')
@ApiTags('meta')
export class MetaController {
  constructor(private readonly metaService: MetaService) {}

  @Get('heroes')
  public async heroes() {
    return this.metaService.heroesSummary();
  }
}
