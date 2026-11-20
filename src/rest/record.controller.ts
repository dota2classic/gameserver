import { Controller, Get, Inject, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Cache, CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { PlayerDailyRecord, PlayerRecordsResponse, PlayerYearSummaryDto } from 'rest/dto/record.dto';
import { PlayerRecords, RecordService, RecordTimespan } from 'rest/service/record.service';
import { Mapper } from 'rest/mapper';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';

@Controller("record")
@ApiTags("record")
@UseInterceptors(CacheInterceptor)
@UseInterceptors(ReqLoggingInterceptor)
export class RecordController {
  constructor(
    private readonly mapper: Mapper,
    private readonly recordService: RecordService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get("year/:steamId")
  public async yearResults(@Param('steamId') steamId: string): Promise<PlayerYearSummaryDto> {
    return this.recordService.yearResults(2025, steamId)
  }


  @Get("player_daily")
  public async playerDaily(): Promise<PlayerDailyRecord[]> {
    return this.recordService.dailyPlayerRecords();
  }

  @Get()
  public async records(): Promise<PlayerRecordsResponse> {
    return this.mapRecords(await this.recordService.getPlayerRecords());
  }

  @Get("/:steam_id")
  public async playerRecord(
    @Param("steam_id") steamId: string,
  ): Promise<PlayerRecordsResponse> {
    return this.mapRecords(await this.recordService.getPlayerRecords(steamId));
  }

  private mapRecords(records: PlayerRecords): PlayerRecordsResponse {
    return {
      overall: records[RecordTimespan.OVERALL].map(this.mapper.mapRecordDto),
      season: records[RecordTimespan.SEASON].map(this.mapper.mapRecordDto),
      month: records[RecordTimespan.MONTHLY].map(this.mapper.mapRecordDto),
      day: records[RecordTimespan.DAY].map(this.mapper.mapRecordDto),
    };
  }
}
