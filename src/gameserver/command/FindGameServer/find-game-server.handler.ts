import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Inject, Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import {
  FullMatchPlayer,
  GSMatchInfo,
  LaunchGameServerCommand,
} from 'gateway/commands/LaunchGameServer/launch-game-server.command';
import { GetUserInfoQuery } from 'gateway/queries/GetUserInfo/get-user-info.query';
import { GetUserInfoQueryResult } from 'gateway/queries/GetUserInfo/get-user-info-query.result';
import { MatchEntity } from 'gameserver/model/match.entity';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand>
{
  private readonly logger = new Logger(FindGameServerHandler.name);

  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly qbus: QueryBus,
    @Inject("QueryCore") private readonly redisEventQueue: ClientProxy,
    @Inject("RMQ") private readonly rmq: ClientProxy,
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
  ) {

  }

  async execute(command: FindGameServerCommand) {
    const gsInfo = await this.extendMatchInfo(command.info);

    const m = new MatchEntity();
    m.server = MatchEntity.NOT_DECIDED_SERVER;
    m.mode = command.info.mode;
    m.started = false;
    m.finished = false;
    m.matchInfoJson = {
      ...gsInfo,
    };

    await this.matchEntityRepository.save(m);

    this.logger.log("Created match stub");

    await this.submitQueueTask(m.id, gsInfo);
  }

  private async extendMatchInfo(
    matchInfo: GamePreparedEvent,
  ): Promise<GSMatchInfo> {
    const players: FullMatchPlayer[] = [];

    // TODO: i dont like it and want to move username resolving into operator
    const resolves = matchInfo.players.map(async (t) => {
      const res = await this.qbus.execute<
        GetUserInfoQuery,
        GetUserInfoQueryResult
      >(new GetUserInfoQuery(t.playerId));
      players.push(
        new FullMatchPlayer(t.playerId, t.team, res.name, t.partyId),
      );
    });

    await Promise.all(resolves);

    return new GSMatchInfo(
      matchInfo.mode,
      matchInfo.map,
      matchInfo.gameMode,
      matchInfo.roomId,
      players,
      matchInfo.version,
      0,
    );
  }

  private async submitQueueTask(matchId: number, info: GSMatchInfo) {
    this.rmq.emit(
      LaunchGameServerCommand.name,
      new LaunchGameServerCommand(matchId, info),
    );
    this.logger.log("Submitted start server command to queue");
  }
}
