import { Controller, Get, Inject, Logger, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Cache, CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { PlayerDailyRecord, PlayerRecordDto, PlayerRecordsResponse } from 'rest/dto/record.dto';
import { RecordService, RecordTimespan } from 'rest/service/record.service';
import { Mapper } from 'rest/mapper';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';

@Controller("record")
@ApiTags("record")
@UseInterceptors(CacheInterceptor)
@UseInterceptors(ReqLoggingInterceptor)
export class RecordController {
  private readonly logger = new Logger(RecordController.name);

  constructor(
    private readonly mapper: Mapper,
    private readonly recordService: RecordService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}



  @Get("player_daily")
  public async playerDaily(): Promise<PlayerDailyRecord[]> {
    return this.recordService.dailyPlayerRecords();
  }

  @Get()
  public async records(): Promise<PlayerRecordsResponse> {
    this.logger.log("Actual method call");
    const [overall, season, month, day] = await Promise.combine<
      PlayerRecordDto[],
      PlayerRecordDto[],
      PlayerRecordDto[],
      PlayerRecordDto[]
    >([
      this.recordService
        .getPlayerRecords(RecordTimespan.OVERALL)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      this.recordService
        .getPlayerRecords(RecordTimespan.SEASON)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      this.recordService
        .getPlayerRecords(RecordTimespan.MONTHLY)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      this.recordService
        .getPlayerRecords(RecordTimespan.DAY)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
    ]);

    return {
      overall,
      season,
      month,
      day,
    };
  }

  @Get("/:steam_id")
  public async playerRecord(
    @Param("steam_id") steamId: string,
  ): Promise<PlayerRecordsResponse> {
    const [overall, season, month, day] = await Promise.combine<
      PlayerRecordDto[],
      PlayerRecordDto[],
      PlayerRecordDto[],
      PlayerRecordDto[]
    >([
      this.recordService
        .getPlayerRecords(RecordTimespan.OVERALL, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      this.recordService
        .getPlayerRecords(RecordTimespan.SEASON, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      this.recordService
        .getPlayerRecords(RecordTimespan.MONTHLY, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      this.recordService
        .getPlayerRecords(RecordTimespan.DAY, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
    ]);

    return {
      overall,
      season,
      month,
      day,
    };
  }
}
