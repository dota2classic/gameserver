import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MetaService } from 'rest/service/meta.service';
import { NullableIntPipe } from 'util/pipes';
import { ItemDto, ItemHeroDto } from 'rest/dto/meta.dto';

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



  @Get('items')
  public async items(): Promise<ItemDto[]>{
    return (await this.metaService.items()).map(it => ({ item: it.item_id, popularity: it.popularity, games: it.games_played, wins: it.wins }))
  }

  @Get('items/:item')
  public async itemData(@Param("item", NullableIntPipe) item: number): Promise<ItemHeroDto[]>{
    return (await this.metaService.itemHeroes(item)).map(it => ({ item: it.item_id, hero: it.hero, wins: it.wins, played: it.played }))
  }
}
