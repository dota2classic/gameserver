import { Index, ViewColumn, ViewEntity } from 'typeorm';
import { ItemView } from 'gameserver/model/item.view';

@ViewEntity({
  name: "item_hero_view",
  dependsOn: [ItemView],
  expression: `
SELECT i.item_id,
       pim_items.hero,
       COUNT(*)::integer AS played,
       SUM((pim_items.team = fm.winner)::int)::integer AS wins
FROM
  (SELECT DISTINCT pim."matchId",
                   pim.hero,
                   pim.team,
                   item_id
   FROM player_in_match pim,
        LATERAL
     (SELECT DISTINCT unnest_item AS item_id
      FROM unnest(array[item0, item1, item2, item3, item4, item5]) AS unnest_item) AS item_unnested) pim_items
JOIN item_view i ON i.item_id = pim_items.item_id
JOIN finished_match fm ON fm.id = pim_items."matchId"
WHERE fm.matchmaking_mode in (0, 1)
GROUP BY pim_items.hero,
         i.item_id
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
