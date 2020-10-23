import { QueryBus } from '@nestjs/cqrs';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GetSessionByUserQuery } from 'gateway/queries/GetSessionByUser/get-session-by-user.query';
import { GetSessionByUserQueryResult } from 'gateway/queries/GetSessionByUser/get-session-by-user-query.result';
import { construct } from 'gateway/util/construct';

@Controller()
export class QueryController {
  constructor(private readonly qbus: QueryBus) {}

  @MessagePattern(GetSessionByUserQuery.name)
  async GetSessionByUserQuery(
    query: GetSessionByUserQuery,
  ): Promise<GetSessionByUserQueryResult> {
    return this.qbus.execute(construct(GetSessionByUserQuery, query));
  }
}
