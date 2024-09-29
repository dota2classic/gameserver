import { Index, ViewColumn, ViewEntity } from 'typeorm';
import { ItemMap } from 'util/items';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';


@ViewEntity({
  materialized: true,
  synchronize: true,
  name: "item_view",
  expression: `with items as (select pim.item0 as item_id
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
               from player_in_match pim)
select items.item_id                                       as item_id,
       count(pim)::int                                     as games_played,
       sum((pim.team = fm.winner)::int)::int               as wins,
       sum((pim.team != fm.winner)::int)::int              as loss,
       (row_number() over (order by count(pim) desc))::int as popularity
from items
         left join player_in_match pim
                   on pim.item0 = items.item_id or pim.item1 = items.item_id or pim.item2 = items.item_id or
                      pim.item3 = items.item_id or pim.item4 = items.item_id or pim.item5 = items.item_id
         inner join finished_match fm on fm.id = pim."matchId" and fm.matchmaking_mode in (${MatchmakingMode.RANKED}, ${MatchmakingMode.UNRANKED})
where items.item_id != 0
group by items.item_id`
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
