import { Body, Controller, Get, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { QueryBus } from '@nestjs/cqrs';
import { BanStatusDto, ReportPlayerDto, ReportsAvailableDto, SmurfData } from 'rest/dto/player.dto';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerId } from 'gateway/shared-types/player-id';
import { PlayerFeedbackService } from 'gameserver/service/player-feedback.service';
import { PlayerQualityService } from 'gameserver/service/player-quality.service';
import { GetReportsAvailableQuery } from 'gateway/queries/GetReportsAvailable/get-reports-available.query';
import { GetReportsAvailableQueryResult } from 'gateway/queries/GetReportsAvailable/get-reports-available-query.result';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerModerationController {
  constructor(
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
    private readonly report: PlayerFeedbackService,
    private readonly playerQuality: PlayerQualityService,
    private readonly qbus: QueryBus,
  ) {}

  @Get('/ban_info/:id')
  async banInfo(@Param('id') steam_id: string): Promise<BanStatusDto> {
    const ban = await this.playerBanRepository.findOne({ where: { steam_id } });
    const res: BanStatus = ban?.asBanStatus() || BanStatus.NOT_BANNED;
    return { steam_id, ...res };
  }

  @Get('/smurf_data/:id')
  async smurfData(@Param('id') steamId: string): Promise<SmurfData> {
    const data = await this.playerQuality.getSmurfData(steamId);
    return {
      relatedBans: data.map((info) => ({
        steam_id: info.steam_id,
        isBanned: info.end_time && info.end_time.getTime() > Date.now(),
        bannedUntil: (info.end_time && info.end_time.toISOString()) || new Date(0).toISOString(),
        status: info.reason,
      })),
    };
  }

  @Post('/report')
  async reportPlayer(@Body() dto: ReportPlayerDto) {
    await this.report.handlePlayerReport(dto.reporterSteamId, dto.reportedSteamId, dto.aspect, dto.matchId);
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10_000)
  @Get('/reports/:id')
  async reportsAvailable(@Param('id') steamId: string): Promise<ReportsAvailableDto> {
    const r = await this.qbus.execute<GetReportsAvailableQuery, GetReportsAvailableQueryResult>(
      new GetReportsAvailableQuery(new PlayerId(steamId)),
    );
    return { count: r.available };
  }
}
