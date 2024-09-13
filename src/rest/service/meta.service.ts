import { Injectable } from '@nestjs/common';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import { HeroItemDto, HeroSummaryDto } from 'rest/dto/meta.dto';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Page } from 'rest/dto/page';
import { cached } from 'util/method-cache';
import FinishedMatch from 'gameserver/entity/finished-match';

@Injectable()
export class MetaService {
  constructor(
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    @InjectRepository(FinishedMatch)
    private readonly matchRepository: Repository<FinishedMatch>,
    private readonly connection: Connection
  ) {}

  @cached(60 * 24, 'meta_heroMatches')
  public async heroMatches(
    page: number,
    perPage: number,
    hero: string,
  ): Promise<Page<FinishedMatch>> {
    const [ids, count] = await this.matchRepository
      .createQueryBuilder('m')
      .select(['m.id', 'm.timestamp'])
      .addOrderBy('m.timestamp', 'DESC')
      .leftJoin('m.players', 'pims')
      .where('pims.hero = :hero', { hero })
      .andWhere('m.matchmaking_mode in (:...modes)', {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })
      .take(perPage)
      .skip(perPage * page)
      .getManyAndCount();

    const mapped = await this.matchRepository.find({
      where: {
        id: In(ids.map(t => t.id)),
      },
    });

    return {
      data: mapped,
      page,
      perPage: perPage,
      pages: Math.ceil(count / perPage),
    };
  }

  // 24 hours
  @cached(60 * 24, 'meta_heroesSummary')
  public async heroesSummary(): Promise<HeroSummaryDto[]> {
    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin(`pim.match`, 'm')
      .select('pim.hero', 'hero')
      .where('m.matchmaking_mode in (:...modes)', {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })
      .addSelect('cast(sum((pim.team = m.winner)::int) as integer)', 'wins')
      .addSelect('cast(sum((pim.team != m.winner)::int) as integer)', 'losses')
      .addSelect('cast(count(pim) as integer)', 'games')
      .addSelect('cast(avg(pim.kills) as float)', 'kills')
      .addSelect('cast(avg(pim.deaths) as float)', 'deaths')
      .addSelect('cast(avg(pim.assists) as float)', 'assists')
      .addSelect('cast(avg(pim.last_hits) as float)', 'last_hits')
      .addSelect('cast(avg(pim.denies) as float)', 'denies')
      .addSelect('cast(avg(pim.gpm) as float)', 'gpm')
      .addSelect('cast(avg(pim.xpm) as float)', 'xpm')
      .addGroupBy('pim.hero')
      .getRawMany();
  }

  /**
   * This is a heavy method that should be cached
   * @param hero
   */
  public async heroMeta(hero: string) {
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
               where pim.hero = $1),
     winrates as (
         select i.item_id as item, sum(g.win) as wins , avg(g.win) as winrate, count(g) as game_count
         from item_view i,
              games g
         where i.item_id in (g.item0, g.item1, g.item2, g.item3, g.item4, g.item5)
         group by i.item_id) select w.item, w.wins::int, w.game_count::int, w.winrate::float from winrates w where w.game_count > 10 and w.item != 0 
order by w.game_count desc`


    return this.connection.query<HeroItemDto[]>(query, [hero]);

  }
}
