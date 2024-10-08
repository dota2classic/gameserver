import { Injectable } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { measure } from 'util/measure';
import { MatchPageDto } from 'rest/dto/match.dto';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Mapper } from 'rest/mapper';
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
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
    private readonly mapper: Mapper,
  ) {}

  @measure('getMatchPage:legacy')
  public async getMatchPage(
    page: number,
    perPage: number,
    mode?: MatchmakingMode,
  ): Promise<MatchPageDto> {
    const [
      slice,
      totalCount,
    ] = await this.finishedMatchEntityRepository.findAndCount({
      where: !mode
        ? {}
        : {
            matchmaking_mode: mode,
          },
      take: perPage,
      skip: perPage * page,
      order: {
        timestamp: 'DESC',
      },
    });

    return {
      data: slice.map(this.mapper.mapMatch),
      page,
      perPage: perPage,
      pages: Math.ceil(totalCount / perPage),
    };
  }

  public async playerMatches(steam_id: string, page: number, perPage: number, mode?: MatchmakingMode, hero?: string): Promise<[
    PlayerInMatchEntity[],
    number
  ]>{
    let query = this.playerInMatchEntityRepository
      .createQueryBuilder('pim')
      .innerJoinAndSelect('pim.match', 'm')
      .innerJoinAndSelect('m.players', 'players')
      .where(`pim.playerId = '${steam_id}'`)
      .orderBy('m.timestamp', 'DESC')
      .take(perPage)
      .skip(perPage * page);

    if (mode !== undefined) {
      query.andWhere(`m.matchmaking_mode = :mode`, { mode });
    }
    if (hero !== undefined) {
      query.andWhere(`pim.hero = :hero`, { hero });
    }

    const [pims, total] = await query.getManyAndCount();

    return [pims, total]
  }

}
