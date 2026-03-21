import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePattern } from '@nestjs/microservices';
import { GetReportsAvailableQuery } from 'gateway/queries/GetReportsAvailable/get-reports-available.query';
import { GetReportsAvailableQueryResult } from 'gateway/queries/GetReportsAvailable/get-reports-available-query.result';
import { construct } from 'gateway/util/construct';

@Controller()
export class ModerationQueryController {
  constructor(private readonly qbus: QueryBus) {}

  @MessagePattern(GetReportsAvailableQuery.name)
  async GetReportsAvailableQuery(query: GetReportsAvailableQuery): Promise<GetReportsAvailableQueryResult> {
    return this.qbus.execute(construct(GetReportsAvailableQuery, query));
  }
}
