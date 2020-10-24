import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger, Type } from '@nestjs/common';
import { GetSessionByUserQuery } from 'gateway/queries/GetSessionByUser/get-session-by-user.query';
import { GetSessionByUserQueryResult } from 'gateway/queries/GetSessionByUser/get-session-by-user-query.result';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';

@QueryHandler(GetSessionByUserQuery)
export class GetSessionByUserHandler
  implements IQueryHandler<GetSessionByUserQuery, GetSessionByUserQueryResult> {
  private readonly logger = new Logger(GetSessionByUserHandler.name);

  constructor(private readonly rep: GameServerSessionRepository) {}

  async execute(
    command: GetSessionByUserQuery,
  ): Promise<GetSessionByUserQueryResult> {
    const session = await this.rep.findWith(command.playerId);

    return new GetSessionByUserQueryResult(session?.url);
  }
}
