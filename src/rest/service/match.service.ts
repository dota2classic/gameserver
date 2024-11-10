import { Injectable } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { measure } from 'util/measure';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

@Injectable()
export class MatchService {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<
      FinishedMatchEntity
    >,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<
      PlayerInMatchEntity
    >,
  ) {}

  @measure('getMatchPage')
  public async getMatchPage(
    page: number,
    perPage: number,
    mode?: MatchmakingMode,
  ): Promise<[FinishedMatchEntity[], number]> {
    const condition = !mode
      ? {}
      : {
          matchmaking_mode: mode,
        };

    // This query has to use take() and skip(), because we are mapping all PIMs
    const items = this.finishedMatchEntityRepository
      .createQueryBuilder('fm')
      .leftJoinAndSelect('fm.players', 'players')
      .where(condition)
      .take(perPage)
      .skip(perPage * page)
      .orderBy({ 'fm.timestamp': 'DESC' })
      .getMany();

    const count = this.finishedMatchEntityRepository
      .createQueryBuilder('fm')
      .where(condition)
      .getCount();

    return Promise.combine([items, count]);
  }

  // http_req_waiting...............: avg=218.18ms min=46.31ms med=176.7ms  max=1.07s   p(90)=348.67ms p(95)=641.38ms
  // http_reqs......................: 1695   80.493324/s
  @measure('playerMatches:new')
  public async playerMatchesNew(
    steam_id: string,
    page: number,
    perPage: number,
    mode?: MatchmakingMode,
    hero?: string,
  ): Promise<[FinishedMatchEntity[], number]> {
    const query = this.finishedMatchEntityRepository
      .createQueryBuilder('fm')
      .leftJoinAndSelect('fm.players', 'players')
      .where('players.playerId = :steam_id', { steam_id });

    if (mode !== undefined) {
      query.andWhere(`m.matchmaking_mode = :mode`, { mode });
    }
    if (hero !== undefined) {
      query.andWhere(`pim.hero = :hero`, { hero });
    }

    const pims = query
      .take(perPage)
      .skip(perPage * page)
      .orderBy({ 'fm.timestamp': 'DESC' })
      .getMany()

    const total = query.getCount()

    return Promise.combine([pims, total])
  }
}
