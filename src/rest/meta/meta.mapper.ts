import { Injectable } from '@nestjs/common';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { ItemDto, ItemHeroDto } from 'rest/dto/meta.dto';
import { ItemView } from 'gameserver/model/item.view';

@Injectable()
export class MetaMapper {
  public mapItemHero = (it: ItemHeroView): ItemHeroDto => ({
    item: it.item_id,
    hero: it.hero,
    wins: it.wins,
    played: it.played,
  });

  public mapItem = (it: ItemView): ItemDto => ({
    item: it.item_id,
    popularity: it.popularity,
    games: it.games_played,
    wins: it.wins,
  });
}
