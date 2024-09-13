import { Index, ViewColumn, ViewEntity } from 'typeorm';
import { ItemMap } from 'util/items';


@ViewEntity({
  materialized: true,
  expression: `select pim.item0 as item_id
from player_in_match pim
union
select pim.item1
from player_in_match pim
union
select pim.item2
from player_in_match pim
union
select pim.item3
from player_in_match pim
union
select pim.item4
from player_in_match pim
union
select pim.item5
from player_in_match pim`
})
export class ItemView {
  @Index()
  @ViewColumn()
  item_id: number;


  public get itemName(): string {
    return ItemMap.find(it => it.id === this.item_id)!.name
  }
}
