import { Injectable } from '@nestjs/common';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeroSummaryDto } from 'rest/dto/meta.dto';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import Match from 'gameserver/entity/Match';
import { Page } from 'rest/dto/page';
import { cached } from 'util/method-cache';

@Injectable()
export class MetaService {
  constructor(
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  @cached(60 * 24, 'meta_heroMatches')
  public async heroMatches(
    page: number,
    perPage: number,
    hero: string,
  ): Promise<Page<Match>> {
    const [ids, count] = await this.matchRepository
      .createQueryBuilder('m')
      .select(['m.id', 'm.timestamp'])
      .addOrderBy('m.timestamp', 'DESC')
      .leftJoin('m.players', 'pims')
      .where('pims.hero = :hero', { hero })
      .andWhere('m.type in (:...modes)', {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })

      .take(perPage)
      .skip(perPage * page)
      .getManyAndCount();

    const mapped = await this.matchRepository.findByIds(ids.map(t => t.id));

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
      .where('m.type in (:...modes)', {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })
      .addSelect('cast(sum(isWin(pim, m)) as integer)', 'wins')
      .addSelect('cast(sum(isLose(pim, m)) as integer)', 'losses')
      .addSelect('cast(count(pim) as integer)', 'games')
      .addSelect('cast(avg(pim.kills) as float)', 'kills')
      .addSelect('cast(avg(pim.deaths) as float)', 'deaths')
      .addSelect('cast(avg(pim.assists) as float)', 'assists')
      .addGroupBy('pim.hero')
      .getRawMany();
  }
}
