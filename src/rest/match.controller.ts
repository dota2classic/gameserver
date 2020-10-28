import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MatchDto, MatchPageDto } from 'rest/dto/match.dto';
import Match from 'gameserver/entity/Match';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mapper } from 'rest/mapper';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Controller('match')
@ApiTags('match')
export class MatchController {
  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
  ) {}

  @ApiQuery({
    name: 'page',
    required: true,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
  })
  @ApiQuery({
    name: 'mode',
    required: false,
  })
  @Get('/all')
  async matches(
    @Query('page') page: number,
    @Query('per_page') perPage: number = 25,
    @Query('mode') mode?: MatchmakingMode,
  ): Promise<MatchPageDto> {
    const slice = await this.matchRepository.find({
      where: mode !== undefined ? { type: mode } : {},
      take: perPage,
      skip: perPage * page,
      order: {
        timestamp: 'DESC',
      },
    });

    const pages = await this.matchRepository.count({
      where: mode !== undefined ? { type: mode } : {},
    });

    return {
      data: slice.map(this.mapper.mapMatch),
      page,
      perPage: perPage,
      pages: Math.ceil(pages / perPage),
    };
  }

  @Get('/:id')
  async getMatch(@Param('id') id: number): Promise<MatchDto> {
    const match = await this.matchRepository.findOne(
      {
        id,
      },
      {
        relations: ['players'],
      },
    );

    return this.mapper.mapMatch(match);
  }
}
