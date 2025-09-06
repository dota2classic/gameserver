import { Index, ViewColumn, ViewEntity } from 'typeorm';
import { ItemView } from 'gameserver/model/item.view';


// Counts duplicated items in one PIM
@ViewEntity({
  name: "item_hero_view",
  dependsOn: [ItemView],
  expression: `
SELECT i.item_id,
       pim.hero,
       COUNT(*)::int AS played,
       SUM((pim.team = fm.winner)::int)::int AS wins
FROM player_in_match pim
CROSS JOIN LATERAL UNNEST(ARRAY[pim.item0, pim.item1, pim.item2, pim.item3, pim.item4, pim.item5]) AS u(item_id)
JOIN item_view i ON i.item_id = u.item_id
JOIN finished_match fm ON fm.id = pim."matchId"
WHERE fm.matchmaking_mode IN (0, 1)
GROUP BY pim.hero,
         i.item_id;
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
