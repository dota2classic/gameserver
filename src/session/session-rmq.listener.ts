import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq/lib/amqp/errorBehaviors';
import { SrcdsServerStartedEvent } from 'gateway/events/srcds-server-started.event';
import { AssignStartedServerCommand } from 'gameserver/command/AssignStartedServer/assign-started-server.command';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { PrepareGameCommand } from 'gameserver/command/PrepareGame/prepare-game.command';
import { Region } from 'gateway/shared-types/region';
import { LobbyReadyEvent } from 'gateway/events/lobby-ready.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';

@Controller()
export class SessionRmqListener {
  private readonly logger = new Logger(SessionRmqListener.name);

  constructor(private readonly cbus: CommandBus) {}

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: SrcdsServerStartedEvent.name,
    queue: `gs-queue.${SrcdsServerStartedEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async SrcdsServerStartedEvent(data: SrcdsServerStartedEvent) {
    this.logger.log('SrcdsServerStarted', data);
    await this.cbus.execute(new AssignStartedServerCommand(data.matchId, data.server));
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: RoomReadyEvent.name,
    queue: `gs-queue.${RoomReadyEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async RoomReadyEvent(data: RoomReadyEvent) {
    await this.cbus.execute(
      new PrepareGameCommand(data.mode, data.roomId, data.players, data.version, Region.RU_MOSCOW),
    );
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: LobbyReadyEvent.name,
    queue: `gs-queue.${LobbyReadyEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async LobbyReadyEvent(data: LobbyReadyEvent) {
    await this.cbus.execute(
      new FindGameServerCommand(
        new GamePreparedEvent(
          data.mode, data.gameMode, data.map, data.version,
          data.roomId, data.players, data.patch, data.region, data.params,
        ),
      ),
    );
  }
}
