import { QueryBus } from '@nestjs/cqrs';
import { Controller, Type } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';
import { GetSessionByUserQuery } from 'gateway/queries/GetSessionByUser/get-session-by-user.query';
import { construct } from 'gateway/util/construct';
import { GetPlayerInfoQuery } from 'gateway/queries/GetPlayerInfo/get-player-info.query';
import { GetPlayerInfoQueryResult } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';

@Controller()
export class QueryController {
  constructor(private readonly qbus: QueryBus) {}

  @MessagePattern(GetSessionByUserQuery.name)
  async GetSessionByUserQuery(query: GetSessionByUserQuery) {
    return this.qbus.execute(construct(GetSessionByUserQuery, query));
  }

  @MessagePattern(GetPlayerInfoQuery.name)
  async GetPlayerInfoQuery(
    query: GetPlayerInfoQuery,
  ): Promise<GetPlayerInfoQueryResult> {
    return this.qbus.execute(construct(GetPlayerInfoQuery, query));
  }
}
