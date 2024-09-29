import { Index, ViewColumn, ViewEntity } from 'typeorm';
import { ItemView } from 'gameserver/model/item.view';

@ViewEntity({
  name: "item_hero_view",
  dependsOn: [ItemView],
  expression: `
select i.item_id as item_id, pim.hero as hero, count(pim) as played, sum((pim.team = fm.winner)::int) as wins
from item_view i
         left join player_in_match pim
                   on pim.item0 = i.item_id
                       or pim.item1 = i.item_id
                       or pim.item2 = i.item_id
                       or pim.item3 = i.item_id
                       or pim.item4 = i.item_id
                       or pim.item5 = i.item_id
         inner join finished_match fm on fm.id = pim."matchId"
group by pim.hero, i.item_id
`,
  materialized: true,
})

export class ItemHeroView {
  @ViewColumn()
  @Index()
  item_id: number;

  @ViewColumn()
  hero: string;

  @ViewColumn()
  played: number;

  @ViewColumn()
  wins: number;
}
