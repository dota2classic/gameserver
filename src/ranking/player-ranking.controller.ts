import { BadRequestException, Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { NullableIntPipe } from 'util/pipes';
import { LeaderboardEntryPageDto, StartRecalibrationDto } from 'rest/dto/player.dto';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsOrder, Repository } from 'typeorm';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { makePage } from 'gateway/util/make-page';

// Whitelisted so `sort` can only ever pick a real column — never build
// an ORDER BY from raw user input.
const SORTABLE_COLUMNS = {
  rank: 'rank',
  mmr: 'mmr',
  games: 'games',
  wins: 'wins',
  winrate: 'winrate',
  kda: 'kda',
  playtime: 'playtime',
  abandons: 'abandons',
} as const satisfies Record<string, keyof LeaderboardView>;

type SortableColumn = keyof typeof SORTABLE_COLUMNS;

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerRankingController {
  constructor(
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
    private readonly gameSeasonService: GameSeasonService,
    private readonly playerServiceV2: PlayerServiceV2,
  ) {}

  @Get('/leaderboard')
  @ApiQuery({ name: 'page', required: true })
  @ApiQuery({ name: 'per_page', required: false })
  @ApiQuery({ name: 'season_id', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: Object.keys(SORTABLE_COLUMNS) })
  @ApiQuery({ name: 'sort_dir', required: false, enum: ['ASC', 'DESC'] })
  async leaderboard(
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 100,
    @Query('season_id', NullableIntPipe) seasonId?: number,
    @Query('sort') sort?: string,
    @Query('sort_dir') sortDir?: string,
  ): Promise<LeaderboardEntryPageDto> {
    const order: FindOptionsOrder<LeaderboardView> = sort
      ? this.buildOrder(sort, sortDir)
      : { rank: 'ASC', mmr: 'DESC' };

    const [data, total] = await this.leaderboardViewRepository.findAndCount({
      where: {
        seasonId: seasonId || (await this.gameSeasonService.getCurrentSeason().then((it) => it.id)),
      },
      order,
      take: perPage,
      skip: perPage * page,
    });
    return makePage(data, total, page, perPage, (r) => r);
  }

  private buildOrder(sort: string, sortDir?: string): FindOptionsOrder<LeaderboardView> {
    if (!(sort in SORTABLE_COLUMNS)) {
      throw new BadRequestException(
        `Unknown sort column "${sort}". Allowed: ${Object.keys(SORTABLE_COLUMNS).join(', ')}`,
      );
    }
    const dir = sortDir === 'ASC' ? 'ASC' : 'DESC';
    const column = SORTABLE_COLUMNS[sort as SortableColumn];
    // Tie-break on rank so pagination stays stable when many players share
    // the same sorted value (e.g. 0 games -> 0 winrate for a lot of rows).
    return { [column]: dir, rank: 'ASC' } as FindOptionsOrder<LeaderboardView>;
  }

  @Post('/start_recalibration')
  async startRecalibration(@Body() dto: StartRecalibrationDto) {
    await this.playerServiceV2.startRecalibration(dto.steamId);
  }
}
