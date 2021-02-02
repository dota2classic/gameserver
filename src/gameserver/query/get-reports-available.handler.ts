import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetReportsAvailableQuery } from 'gateway/queries/GetReportsAvailable/get-reports-available.query';
import { GetReportsAvailableQueryResult } from 'gateway/queries/GetReportsAvailable/get-reports-available-query.result';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerReport } from 'gameserver/model/player-report';
import { cached } from 'util/method-cache';

@QueryHandler(GetReportsAvailableQuery)
export class GetReportsAvailableHandler
  implements
    IQueryHandler<GetReportsAvailableQuery, GetReportsAvailableQueryResult> {
  private readonly logger = new Logger(GetReportsAvailableHandler.name);

  constructor(
    @InjectRepository(PlayerReport)
    private readonly playerReportRepository: Repository<PlayerReport>,
  ) {}

  @cached(360, GetReportsAvailableQuery.name)
  async execute(
    command: GetReportsAvailableQuery,
  ): Promise<GetReportsAvailableQueryResult> {
    let c = await this.playerReportRepository.findOne({
      steam_id: command.id.value,
    });
    if (!c) {
      c = new PlayerReport();
      c.steam_id = command.id.value;
      await this.playerReportRepository.save(c);
    }

    return new GetReportsAvailableQueryResult(c.reports);
  }
}
