import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetReportsAvailableQuery } from 'gateway/queries/GetReportsAvailable/get-reports-available.query';
import { GetReportsAvailableQueryResult } from 'gateway/queries/GetReportsAvailable/get-reports-available-query.result';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';

@QueryHandler(GetReportsAvailableQuery)
export class GetReportsAvailableHandler
  implements
    IQueryHandler<GetReportsAvailableQuery, GetReportsAvailableQueryResult> {
  private readonly logger = new Logger(GetReportsAvailableHandler.name);

  constructor(
    @InjectRepository(PlayerReportStatusEntity)
    private readonly playerReportRepository: Repository<PlayerReportStatusEntity>,
  ) {}

  async execute(
    command: GetReportsAvailableQuery,
  ): Promise<GetReportsAvailableQueryResult> {
    let c = await this.playerReportRepository.findOne({
      where: { steam_id: command.id.value },
    });
    if (!c) {
      c = new PlayerReportStatusEntity();
      c.steam_id = command.id.value;
      await this.playerReportRepository.save(c);
    }

    return new GetReportsAvailableQueryResult(command.id, c.reports);
  }
}
