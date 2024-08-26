import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MatchDto, MatchPageDto } from 'rest/dto/match.dto';
import Match from 'gameserver/entity/Match';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mapper } from 'rest/mapper';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { MetaService } from 'rest/service/meta.service';

@Controller('match')
@ApiTags('match')
export class MatchController {
  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    private readonly metaService: MetaService,
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
    name: 'hero',
  })
  @Get('/by_hero')
  async heroMatches(
    @Query('page', ParseIntPipe) page: number,
    @Query('per_page', ParseIntPipe) perPage: number = 25,
    @Query('hero') hero: string,
  ): Promise<MatchPageDto> {
    const raw = await this.metaService.heroMatches(page, perPage, hero);

    return {
      ...raw,
      data: raw.data.map(this.mapper.mapMatch),
    };
  }

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
    @Query('page', ParseIntPipe) page: number,
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
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ['players'],
    });

    return this.mapper.mapMatch(match);
  }

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
  @ApiQuery({
    name: 'hero',
    required: false,
  })
  @Get('/player/:id')
  async playerMatches(
    @Param('id') steam_id: string,
    @Query('page', ParseIntPipe) page: number,
    @Query('per_page') perPage: number = 25,
    @Query('mode') mode?: MatchmakingMode,
    @Query('hero') hero?: string,
  ): Promise<MatchPageDto> {
    let query = this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoinAndSelect('pim.match', 'm')
      .innerJoinAndSelect('m.players', 'players')
      .where(`pim.playerId = '${steam_id}'`)
      .orderBy('m.timestamp', 'DESC')
      .take(perPage)
      .skip(perPage * page);

    if (mode !== undefined) {
      query.andWhere(`m.type = :mode`, { mode });
    }
    if (hero !== undefined) {
      query.andWhere(`pim.hero = :hero`, { hero });
    }

    const [pims, total] = await query.getManyAndCount();

    return {
      data: pims.map(t => t.match).map(this.mapper.mapMatch),
      page,
      perPage: perPage,
      pages: Math.ceil(total / perPage),
    };
  }
}
