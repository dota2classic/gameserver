import { Controller, Logger } from "@nestjs/common";
import { CommandBus, Constructor } from "@nestjs/cqrs";
import { GameResultsEvent } from "gateway/events/gs/game-results.event";
import { MatchFailedEvent } from "gateway/events/match-failed.event";
import { PlayerAbandonedEvent } from "gateway/events/bans/player-abandoned.event";
import { ConfigService } from "@nestjs/config";
import { SaveGameResultsCommand } from "gameserver/command/SaveGameResults/save-game-results.command";
import { SaveMatchFailedCommand } from "gameserver/command/SaveMatchFailed/save-match-failed.command";
import { SavePlayerAbandonCommand } from "gameserver/command/SavePlayerAbandon/save-player-abandon.command";
import { SrcdsServerStartedEvent } from "gateway/events/srcds-server-started.event";
import { AssignStartedServerCommand } from "gameserver/command/AssignStartedServer/assign-started-server.command";
import { RoomReadyEvent } from "gateway/events/room-ready.event";
import { PrepareGameCommand } from "gameserver/command/PrepareGame/prepare-game.command";
import { PlayerDeclinedGameEvent } from "gateway/events/mm/player-declined-game.event";
import { CreateCrimeLogCommand } from "gameserver/command/CreateCrimeLog/create-crime-log.command";
import { BanReason } from "gateway/shared-types/ban";
import { LobbyReadyEvent } from "gateway/events/lobby-ready.event";
import { FindGameServerCommand } from "gameserver/command/FindGameServer/find-game-server.command";
import { GamePreparedEvent } from "gameserver/event/game-prepared.event";
import { RabbitSubscribe } from "@golevelup/nestjs-rabbitmq";
import { MessageHandlerErrorBehavior } from "@golevelup/nestjs-rabbitmq/lib/amqp/errorBehaviors";
import { Region } from "gateway/shared-types/region";
import { MatchArtifactUploadedEvent } from "gateway/events/match-artifact-uploaded.event";
import { AttachReplayCommand } from "gameserver/command/AttachReplayCommand/attach-replay.command";
import { MatchArtifactType } from "gateway/shared-types/match-artifact-type";

@Controller()
export class RmqController {
  private readonly logger = new Logger(RmqController.name);

  constructor(
    private readonly cbus: CommandBus,
    private readonly config: ConfigService,
  ) {}

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: SrcdsServerStartedEvent.name,
    queue: `gs-queue.${SrcdsServerStartedEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async SrcdsServerStartedEvent(data: SrcdsServerStartedEvent) {
    this.logger.log("SrcdsServerStarted", data);
    await this.processMessage(
      new AssignStartedServerCommand(data.matchId, data.server),
    );
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: GameResultsEvent.name,
    queue: `gs-queue.${GameResultsEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async GameResultsEvent(data: GameResultsEvent) {
    await this.processMessage(new SaveGameResultsCommand(data));
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: MatchFailedEvent.name,
    queue: `gs-queue.${MatchFailedEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async MatchFailedEvent(data: MatchFailedEvent) {
    await this.processMessage(new SaveMatchFailedCommand(data));
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: PlayerAbandonedEvent.name,
    queue: `gs-queue.${PlayerAbandonedEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async PlayerAbandonedEvent(data: PlayerAbandonedEvent) {
    await this.processMessage(new SavePlayerAbandonCommand(data));
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: RoomReadyEvent.name,
    queue: `gs-queue.${RoomReadyEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async RoomReadyEvent(data: RoomReadyEvent) {
    await this.processMessage(
      new PrepareGameCommand(
        data.mode,
        data.roomId,
        data.players,
        data.version,
        Region.RU_MOSCOW, // FIXME MAKE COME FROM MATCHMAKER
      ),
    );
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: LobbyReadyEvent.name,
    queue: `gs-queue.${LobbyReadyEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async LobbyReadyEvent(data: LobbyReadyEvent) {
    await this.processMessage(
      new FindGameServerCommand(
        new GamePreparedEvent(
          data.mode,
          data.gameMode,
          data.map,
          data.version,
          data.roomId,
          data.players,
          data.enableCheats,
          data.fillBots,
          data.patch,
          data.region,
          data.noRunes,
          data.midTowerToWin,
          data.killsToWin,
        ),
      ),
    );
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: PlayerDeclinedGameEvent.name,
    queue: `gs-queue.${PlayerDeclinedGameEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async PlayerDeclinedGameEvent(data: PlayerDeclinedGameEvent) {
    await this.processMessage(
      new CreateCrimeLogCommand(
        data.steamId,
        BanReason.GAME_DECLINE,
        data.mode,
      ),
    );
  }

  @RabbitSubscribe({
    exchange: "app.events",
    routingKey: MatchArtifactUploadedEvent.name,
    queue: `gs-queue.${MatchArtifactUploadedEvent.name}`,
  })
  async MatchArtifactUploadedEvent(data: MatchArtifactUploadedEvent) {
    this.logger.log("Handling uploaded artifact", data);
    if (data.artifactType === MatchArtifactType.REPLAY) {
      await this.processMessage(
        new AttachReplayCommand(
          data.matchId,
          data.lobbyType,
          `${data.bucket}/${data.key}`,
        ),
      );
    }
  }

  private async construct<T>(
    constructor: Constructor<T>,
    data: any,
  ): Promise<T> {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    return buff;
  }

  private async processMessage<T>(cmd: T) {
    await this.cbus.execute(cmd);
  }
}
