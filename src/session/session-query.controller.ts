import { Controller } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { MessagePattern } from '@nestjs/microservices';
import { GetSessionByUserQuery } from 'gateway/queries/GetSessionByUser/get-session-by-user.query';
import { construct } from 'gateway/util/construct';

@Controller()
export class SessionQueryController {
  constructor(private readonly qbus: QueryBus) {}

  @MessagePattern(GetSessionByUserQuery.name)
  async GetSessionByUserQuery(query: GetSessionByUserQuery) {
    return this.qbus.execute(construct(GetSessionByUserQuery, query));
  }
}
