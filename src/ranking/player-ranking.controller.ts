import { Body, Controller, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { NullableIntPipe } from 'util/pipes';
import { LeaderboardEntryPageDto, StartRecalibrationDto } from 'rest/dto/player.dto';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { makePage } from 'gateway/util/make-page';

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
  async leaderboard(
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 100,
    @Query('season_id', NullableIntPipe) seasonId?: number,
  ): Promise<LeaderboardEntryPageDto> {
    const [data, total] = await this.leaderboardViewRepository.findAndCount({
      where: {
        seasonId: seasonId || (await this.gameSeasonService.getCurrentSeason().then((it) => it.id)),
      },
      order: { rank: 'ASC', mmr: 'DESC' },
      take: perPage,
      skip: perPage * page,
    });
    return makePage(data, total, page, perPage, (r) => r);
  }

  @Post('/start_recalibration')
  async startRecalibration(@Body() dto: StartRecalibrationDto) {
    await this.playerServiceV2.startRecalibration(dto.steamId);
  }
}
