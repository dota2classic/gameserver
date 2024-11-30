import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetaService } from './meta.service';
import { NullableIntPipe } from 'util/pipes';
import { HeroItemDto, HeroSummaryDto, ItemDto, ItemHeroDto } from 'rest/dto/meta.dto';
import { MetaMapper } from 'rest/meta/meta.mapper';

@Controller("meta")
@ApiTags("meta")
export class MetaController {
  constructor(
    private readonly metaService: MetaService,
    private readonly mapper: MetaMapper,
  ) {}

  @Get("heroes")
  public async heroes(): Promise<HeroSummaryDto[]> {
    return this.metaService.heroesSummary();
  }

  @Get("heroes/:hero")
  public async heroData(@Param("hero") hero: string): Promise<HeroItemDto[]> {
    return this.metaService.heroMeta(hero);
  }

  @Get("items")
  public async items(): Promise<ItemDto[]> {
    return (await this.metaService.items()).map(this.mapper.mapItem);
  }

  @Get("items/:item")
  public async itemData(
    @Param("item", NullableIntPipe) item: number,
  ): Promise<ItemHeroDto[]> {
    return (await this.metaService.itemHeroes(item)).map((it) => ({
      item: it.item_id,
      hero: it.hero,
      wins: it.wins,
      played: it.played,
    }));
  }
}
