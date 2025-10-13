import { Index, ViewColumn, ViewEntity } from 'typeorm';
import { ItemMap } from 'util/items';


@ViewEntity({
  materialized: true,
  name: "item_view",
  expression: `
WITH flat_items AS
  (SELECT pim."matchId",
          pim.team,
          unnest(array[pim.item0, pim.item1, pim.item2, pim.item3, pim.item4, pim.item5]) AS item_id
   FROM player_in_match pim
   JOIN finished_match fm ON fm.id = pim."matchId"
   WHERE fm.matchmaking_mode IN (0,
                                 1)),
     filtered_items AS
  (SELECT item_id,
          team,
          "matchId"
   FROM flat_items
   WHERE item_id <> 0),
     with_match AS
  (SELECT fi.*,
          fm.winner
   FROM filtered_items fi
   JOIN finished_match fm ON fm.id = fi."matchId"),
     item_stats AS
  (SELECT item_id,
          count(*)::integer AS games_played,
          sum((team = winner)::int)::integer AS wins,
          sum((team <> winner)::int)::integer AS loss
   FROM with_match
   GROUP BY item_id)
SELECT *,
       row_number() OVER (
                          ORDER BY games_played DESC)::integer AS popularity
FROM item_stats;
`
})
export class ItemView {
  @Index()
  @ViewColumn()
  item_id: number;


  @ViewColumn({ name: "games_played"})
  games_played: number;

  @ViewColumn({ name: "wins"})
  wins: number;

  @ViewColumn({ name: "loss"})
  loss: number;

  @ViewColumn({ name: "popularity"})
  popularity: number;

  public get itemName(): string {
    return ItemMap.find(it => it.id === this.item_id)!.name
  }
}
