import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetSessionByUserQuery } from 'gateway/queries/GetSessionByUser/get-session-by-user.query';
import { GetSessionByUserQueryResult } from 'gateway/queries/GetSessionByUser/get-session-by-user-query.result';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';

@QueryHandler(GetSessionByUserQuery)
export class GetSessionByUserHandler
  implements IQueryHandler<GetSessionByUserQuery, GetSessionByUserQueryResult>
{
  private readonly logger = new Logger(GetSessionByUserHandler.name);

  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly sessionRepo: Repository<GameServerSessionEntity>,
  ) {}

  async execute(
    command: GetSessionByUserQuery,
  ): Promise<GetSessionByUserQueryResult> {
    const all = await this.sessionRepo.find({
      relations: ["players"],
    });

    const session = all.find(
      (t) =>
        t.gameState !== Dota_GameRulesState.POST_GAME &&
        t.players.find(
          (z) => z.steamId === command.playerId.value && z.abandoned === false,
        ),
    );

    return new GetSessionByUserQueryResult(session?.url);
  }
}
