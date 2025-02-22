import { Controller, Get, Inject, Logger, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Cache, CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager';
import { PlayerRecordsResponse } from 'rest/dto/record.dto';
import { RecordService, RecordTimespan } from 'rest/service/record.service';
import { Mapper } from 'rest/mapper';

@Controller("record")
@ApiTags("record")
@UseInterceptors(CacheInterceptor)
export class RecordController {
  private readonly logger = new Logger(RecordController.name);

  constructor(
    private readonly mapper: Mapper,
    private readonly recordService: RecordService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @Get()
  public async records(): Promise<PlayerRecordsResponse> {
    this.logger.log("Actual method call");
    return {
      overall: await this.recordService
        .getPlayerRecords(RecordTimespan.OVERALL)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      season: await this.recordService
        .getPlayerRecords(RecordTimespan.SEASON)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      month: await this.recordService
        .getPlayerRecords(RecordTimespan.MONTHLY)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
    };
  }


  @Get('/:steam_id')
  public async playerRecord(@Param("steam_id") steamId: string): Promise<PlayerRecordsResponse> {
    return {
      overall: await this.recordService
        .getPlayerRecords(RecordTimespan.OVERALL, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      season: await this.recordService
        .getPlayerRecords(RecordTimespan.SEASON, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
      month: await this.recordService
        .getPlayerRecords(RecordTimespan.MONTHLY, steamId)
        .then((all) => Promise.all(all.map(this.mapper.mapRecordDto))),
    };
  }
}
