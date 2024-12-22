import { CommandHandler, EventBus, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { PrepareGameCommand } from 'gameserver/command/PrepareGame/prepare-game.command';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_Map } from 'gateway/shared-types/dota-map';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';

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
    const mapping = await this.getMappingForLobbyType(command.lobbyType);

    this.ebus.publish(
      new GamePreparedEvent(
        command.lobbyType,
        mapping?.dotaGameMode || Dota_GameMode.ALLPICK,
        mapping?.dotaMap || Dota_Map.DOTA,
        Dota2Version.Dota_684,
        command.roomId,
        command.players,
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
