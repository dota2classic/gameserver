import { Injectable } from '@nestjs/common';
import { Connection, In, Repository } from 'typeorm';
import { measure } from 'util/measure';
import { MatchPageDto } from 'rest/dto/match.dto';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Mapper } from 'rest/mapper';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Injectable()
export class MatchService {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<
      FinishedMatchEntity
    >,
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

  @measure('getMatchPage:legacy')
  public async getMatchPageNew(
    page: number,
    perPage: number,
    mode: number[],
  ): Promise<MatchPageDto> {
    const [
      slice,
      totalCount,
    ] = await this.finishedMatchEntityRepository.findAndCount({
      where:
        mode.length === 0
          ? {}
          : {
              matchmaking_mode: In(mode),
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
}
