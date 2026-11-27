import { CommandHandler, EventBus, ICommandHandler, QueryBus } from "@nestjs/cqrs";
import { Logger } from "@nestjs/common";
import { PrepareGameCommand } from "gameserver/command/PrepareGame/prepare-game.command";
import { GamePreparedEvent } from "gameserver/event/game-prepared.event";
import { MatchmakingMode } from "gateway/shared-types/matchmaking-mode";
import { Dota_Map } from "gateway/shared-types/dota-map";
import { Dota_GameMode } from "gateway/shared-types/dota-game-mode";
import { MatchmakingModeMappingEntity } from "gameserver/model/matchmaking-mode-mapping.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DotaTeam } from "gateway/shared-types/dota-team";
import { Dota2Version } from "gateway/shared-types/dota2version";
import { DotaPatch } from "gateway/constants/patch";
import { GameServerPluginParameters } from "gateway/commands/LaunchGameServer/game-server-plugin-parameters";

@CommandHandler(PrepareGameCommand)
export class PrepareGameHandler implements ICommandHandler<PrepareGameCommand> {
  private readonly logger = new Logger(PrepareGameHandler.name);

  constructor(
    private readonly ebus: EventBus,
    private readonly qbus: QueryBus,
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
  ) {}

  async execute(command: PrepareGameCommand) {
    const secret = command.lobbyType === MatchmakingMode.SECRET;
    if (secret) {
      const radiant = command.players.filter((player) => player.team === DotaTeam.RADIANT);
      const dire = command.players.filter((player) => player.team === DotaTeam.DIRE);
      const uniquePlayers = new Set(command.players.map((player) => player.playerId.value));
      if (command.players.length !== 10 || uniquePlayers.size !== 10 ||
          radiant.length !== 5 || dire.length !== 5) {
        this.logger.warn("Rejected SECRET room with invalid 5v5 roster");
        return;
      }
    }
    const mapping = secret ? undefined : await this.getMappingForLobbyType(command.lobbyType);

    this.ebus.publish(
      new GamePreparedEvent(
        command.lobbyType,
        mapping?.dotaGameMode || Dota_GameMode.ALLPICK,
        mapping?.dotaMap || Dota_Map.DOTA,
        Dota2Version.Dota_684,
        command.roomId,
        command.players,
        mapping?.patch || DotaPatch.DOTA_684,
        command.region,
        new GameServerPluginParameters(
          false,
          false,
          0,
          [MatchmakingMode.UNRANKED, MatchmakingMode.HIGHROOM].includes(
            command.lobbyType,
          ),
          mapping?.fillBots || false,
          mapping?.enableCheats || false,
        ),
      ),
    );
  }

  private async getMappingForLobbyType(
    lobby: MatchmakingMode,
  ): Promise<MatchmakingModeMappingEntity | undefined> {
    return await this.matchmakingModeMappingEntityRepository.findOne({
      where: {
        lobbyType: lobby,
      },
    });
  }
}
