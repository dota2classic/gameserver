import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { Controller, Logger } from '@nestjs/common';
import { CommandBus, Constructor } from '@nestjs/cqrs';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { MatchFailedEvent } from 'gateway/events/match-failed.event';
import { PlayerAbandonedEvent } from 'gateway/events/bans/player-abandoned.event';
import { ConfigService } from '@nestjs/config';
import { SaveGameResultsCommand } from 'gameserver/command/SaveGameResults/save-game-results.command';
import { SaveMatchFailedCommand } from 'gameserver/command/SaveMatchFailed/save-match-failed.command';
import { SavePlayerAbandonCommand } from 'gameserver/command/SavePlayerAbandon/save-player-abandon.command';
import { SrcdsServerStartedEvent } from 'gateway/events/srcds-server-started.event';
import { AssignStartedServerCommand } from 'gameserver/command/AssignStartedServer/assign-started-server.command';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { PrepareGameCommand } from 'gameserver/command/PrepareGame/prepare-game.command';
import { PlayerDeclinedGameEvent } from 'gateway/events/mm/player-declined-game.event';
import { CreateCrimeLogCommand } from 'gameserver/command/CreateCrimeLog/create-crime-log.command';
import { BanReason } from 'gateway/shared-types/ban';
import { LobbyReadyEvent } from 'gateway/events/lobby-ready.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';

@Controller()
export class RmqController {
  private readonly logger = new Logger(RmqController.name);

  constructor(
    private readonly cbus: CommandBus,
    private readonly config: ConfigService,
  ) {}

  @MessagePattern(SrcdsServerStartedEvent.name)
  async SrcdsServerStartedEvent(
    @Payload() data: SrcdsServerStartedEvent,
    @Ctx() context: RmqContext,
  ) {
    await this.processMessage(
      new AssignStartedServerCommand(data.server, data.info),
      context,
    );
  }

  @MessagePattern(GameResultsEvent.name)
  async GameResultsEvent(
    @Payload() data: GameResultsEvent,
    @Ctx() context: RmqContext,
  ) {
    await this.processMessage(new SaveGameResultsCommand(data), context);
  }

  @MessagePattern(MatchFailedEvent.name)
  async MatchFailedEvent(
    @Payload() data: MatchFailedEvent,
    @Ctx() context: RmqContext,
  ) {
    await this.processMessage(new SaveMatchFailedCommand(data), context);
  }

  @MessagePattern(PlayerAbandonedEvent.name)
  async PlayerAbandonedEvent(
    @Payload() data: PlayerAbandonedEvent,
    @Ctx() context: RmqContext,
  ) {
    await this.processMessage(new SavePlayerAbandonCommand(data), context);
  }

  @MessagePattern("RMQ" + RoomReadyEvent.name)
  async RoomReadyEvent(
    @Payload() data: RoomReadyEvent,
    @Ctx() context: RmqContext,
  ) {
    await this.processMessage(
      new PrepareGameCommand(
        data.mode,
        data.roomId,
        data.players,
        data.version,
      ),
      context,
    );
  }

  @MessagePattern("RMQ" + LobbyReadyEvent.name)
  async LobbyReadyEvent(
    @Payload() data: LobbyReadyEvent,
    @Ctx() context: RmqContext,
  ) {
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
        ),
      ),
      context,
    );
  }

  @MessagePattern("RMQ" + PlayerDeclinedGameEvent.name)
  async PlayerDeclinedGameEvent(
    @Payload() data: PlayerDeclinedGameEvent,
    @Ctx() context: RmqContext,
  ) {
    await this.processMessage(
      new CreateCrimeLogCommand(
        data.steamId,
        BanReason.GAME_DECLINE,
        data.mode,
      ),
      context,
    );
  }

  private async construct<T>(
    constructor: Constructor<T>,
    data: any,
  ): Promise<T> {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    return buff;
  }

  private async processMessage<T>(msg: T, context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    return Promise.resolve(msg)
      .then((cmd) => this.cbus.execute(cmd))
      .then(() => channel.ack(originalMsg))
      .catch((e) => {
        this.logger.error(`Error while processing message`, e);
        channel.nack(originalMsg);
      });
  }
}
