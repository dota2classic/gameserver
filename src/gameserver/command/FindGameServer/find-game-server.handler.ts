import { CommandHandler, EventBus, ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { Inject, Logger } from "@nestjs/common";
import { FindGameServerCommand } from "gameserver/command/FindGameServer/find-game-server.command";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientProxy } from "@nestjs/microservices";
import {
  FullMatchPlayer,
  LaunchGameServerCommand,
} from "gateway/commands/LaunchGameServer/launch-game-server.command";
import { GetUserInfoQuery } from "gateway/queries/GetUserInfo/get-user-info.query";
import { GetUserInfoQueryResult } from "gateway/queries/GetUserInfo/get-user-info-query.result";
import { MatchEntity } from "gameserver/model/match.entity";
import { MatchmakingModeMappingEntity } from "gameserver/model/matchmaking-mode-mapping.entity";
import { GamePreparedEvent } from "gameserver/event/game-prepared.event";
import { Role } from "gateway/shared-types/roles";
import { ForumApi } from "generated-api/forum";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand>
{
  private readonly logger = new Logger(FindGameServerHandler.name);

  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly qbus: QueryBus,
    @Inject("QueryCore") private readonly redisEventQueue: ClientProxy,
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
    private readonly forum: ForumApi,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async execute(command: FindGameServerCommand) {
    const launchGameServerCommand = await this.extendMatchInfo(command.info);

    let m = new MatchEntity();
    m.server = MatchEntity.NOT_DECIDED_SERVER;
    m.mode = command.info.mode;
    m.started = false;
    m.finished = false;
    m.matchInfoJson = {
      ...launchGameServerCommand,
    };

    m = await this.matchEntityRepository.save(m);
    launchGameServerCommand.matchId = m.id;

    this.logger.log("Created match stub", {
      match_id: m.id,
      lobby_type: m.mode,
    });

    await this.submitQueueTask(launchGameServerCommand);
  }

  private async extendMatchInfo(
    matchInfo: GamePreparedEvent,
  ): Promise<LaunchGameServerCommand> {
    const players: FullMatchPlayer[] = [];

    // TODO: i dont like it and want to move username resolving into operator
    const resolves = matchInfo.players.map(async (t) => {
      const res = await this.qbus.execute<
        GetUserInfoQuery,
        GetUserInfoQueryResult
      >(new GetUserInfoQuery(t.playerId));

      let isMuted: boolean = false;
      try {
        const r = await this.forum.forumControllerGetUser(t.playerId.value);
        isMuted = new Date(r.muteUntil).getTime() > Date.now();
      } catch (e) {
        console.error(e);
        this.logger.error(
          `Couldn't get mute status of player ${t.playerId.value}`,
          e,
        );
      }

      players.push(
        new FullMatchPlayer(
          t.playerId.value,
          res.name,
          res.roles.includes(Role.OLD),
          isMuted,
          t.partyId,
          t.team,
        ),
      );
    });

    await Promise.all(resolves);

    return new LaunchGameServerCommand(
      -1,
      matchInfo.mode,
      matchInfo.gameMode,
      matchInfo.roomId,
      matchInfo.map,
      players,
      matchInfo.patch,
      matchInfo.region,
      matchInfo.params
    );
  }

  private async submitQueueTask(cmd: LaunchGameServerCommand) {
    this.ebus.publish(cmd);
    this.logger.log("Submitted start server command to queue", cmd);
  }
}
