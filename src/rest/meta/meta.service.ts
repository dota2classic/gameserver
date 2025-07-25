import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroItemDto, HeroSummaryDto } from 'rest/dto/meta.dto';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { ItemView } from 'gameserver/model/item.view';

@Injectable()
export class MetaService {
  constructor(
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(FinishedMatchEntity)
    private readonly matchRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(ItemHeroView)
    private readonly itemHeroViewRepository: Repository<ItemHeroView>,
    @InjectRepository(ItemView)
    private readonly itemViewRepository: Repository<ItemView>,
  ) {}

  public async heroesSummary(): Promise<HeroSummaryDto[]> {
    return this.playerInMatchRepository.query(
      `with picks as (select count(*) as cnt from player_in_match p)
SELECT "pim"."hero"                                      AS "hero",
       (count(pim.hero)::float / greatest(1, s.cnt))::float       as pickrate,
       sum(("pim"."team" = "m"."winner")::int)::integer  AS "wins",
       sum(("pim"."team" != "m"."winner")::int)::integer AS "losses",
       count(pim)::integer                               AS "games",
       avg("pim"."kills")::float                         AS "kills",
       avg("pim"."deaths")::float                        AS "deaths",
       avg("pim"."assists")::float                       AS "assists",
       avg("pim"."last_hits")::float                     AS "last_hits",
       avg("pim"."denies")::float                        AS "denies",
       avg("pim"."gpm")::float                           AS "gpm",
       avg("pim"."xpm")::float                           AS "xpm"
FROM "player_in_match" "pim"
         left join picks s on true
         INNER JOIN "finished_match" "m" ON "m"."id" = "pim"."matchId"
WHERE "m"."matchmaking_mode" in ($1, $2)
GROUP BY "pim"."hero", s.cnt`,
      [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
    );
  }

  /**
   * This is a heavy method that should be cached
   * @param hero
   */

  public async heroMeta(hero: string): Promise<HeroItemDto[]> {
    // This query finds all unique items bought on hero, games that played on this hero, and then counts winrates
    const query = `with games as (select pim.item0,
                      pim.item1,
                      pim.item2,
                      pim.item3,
                      pim.item4,
                      pim.item5,
                      (pim.team = m.winner)::int as win
               from player_in_match pim
                        inner join finished_match m on m.id = pim."matchId"
               where pim.hero = $1 and m.matchmaking_mode in (0, 1)),
     winrates as (
         select i.item_id as item, sum(g.win) as wins , avg(g.win) as winrate, count(g) as game_count
         from item_view i,
              games g
         where i.item_id in (g.item0, g.item1, g.item2, g.item3, g.item4, g.item5)
         group by i.item_id) select w.item, w.wins::int, w.game_count::int, w.winrate::float from winrates w where w.game_count > 10 and w.item != 0 
order by w.game_count desc`;

    return this.playerInMatchRepository.query(query, [hero]);
  }

  public async itemHeroes(item: number): Promise<ItemHeroView[]> {
    return this.itemHeroViewRepository.find({ where: { item_id: item } });
  }

  async items(): Promise<ItemView[]> {
    return this.itemViewRepository.find();
  }
}
