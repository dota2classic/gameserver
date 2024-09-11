import { Controller, Get, Param } from '@nestjs/common';
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


  @Get('heroes/:hero')
  public async heroData(@Param("hero") hero: string){
    return this.metaService.heroMeta(hero)
  }
}
