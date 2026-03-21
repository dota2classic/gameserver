import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePattern } from '@nestjs/microservices';
import { GetPlayerInfoQuery } from 'gateway/queries/GetPlayerInfo/get-player-info.query';
import { GetPlayerInfoQueryResult } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { construct } from 'gateway/util/construct';

@Controller()
export class PlayerQueryController {
  constructor(private readonly qbus: QueryBus) {}

  @MessagePattern(GetPlayerInfoQuery.name)
  async GetPlayerInfoQuery(query: GetPlayerInfoQuery): Promise<GetPlayerInfoQueryResult> {
    return this.qbus.execute(construct(GetPlayerInfoQuery, query));
  }
}
