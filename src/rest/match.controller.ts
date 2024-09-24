import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MatchDto, MatchPageDto } from 'rest/dto/match.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mapper } from 'rest/mapper';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { MetaService } from 'rest/service/meta.service';
import { NullableIntPipe } from 'util/pipes';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchService } from 'rest/service/match.service';


@Controller('match')
@ApiTags('match')
export class MatchController {
  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(FinishedMatchEntity)
    private readonly matchRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    private readonly metaService: MetaService,
    private readonly matchService: MatchService,
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
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 25,
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
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 25,
    @Query('mode') mode?: MatchmakingMode,
  ): Promise<MatchPageDto> {
    return this.matchService.getMatchPage(page, perPage, mode)
  }

  @Get('/:id')
  async getMatch(@Param('id', NullableIntPipe) id: number): Promise<MatchDto> {
    const match = await this.matchRepository.findOneOrFail({
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
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 25,
    @Query('mode', NullableIntPipe) mode?: MatchmakingMode,
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
      query.andWhere(`m.matchmaking_mode = :mode`, { mode });
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
