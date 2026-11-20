import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MessageHandlerErrorBehavior } from '@golevelup/nestjs-rabbitmq/lib/amqp/errorBehaviors';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { SaveGameResultsCommand } from 'gameserver/command/SaveGameResults/save-game-results.command';
import { MatchFailedEvent } from 'gateway/events/match-failed.event';
import { SaveMatchFailedCommand } from 'gameserver/command/SaveMatchFailed/save-match-failed.command';
import { PlayerAbandonedEvent } from 'gateway/events/bans/player-abandoned.event';
import { SavePlayerAbandonCommand } from 'gameserver/command/SavePlayerAbandon/save-player-abandon.command';
import { MatchArtifactUploadedEvent } from 'gateway/events/match-artifact-uploaded.event';
import { AttachReplayCommand } from 'gameserver/command/AttachReplayCommand/attach-replay.command';
import { MatchArtifactType } from 'gateway/shared-types/match-artifact-type';
import { PlayerDeclinedGameEvent } from 'gateway/events/mm/player-declined-game.event';
import { CreateCrimeLogCommand } from 'gameserver/command/CreateCrimeLog/create-crime-log.command';
import { BanReason } from 'gateway/shared-types/ban';

@Controller()
export class MatchRmqListener {
  private readonly logger = new Logger(MatchRmqListener.name);

  constructor(private readonly cbus: CommandBus) {}

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: GameResultsEvent.name,
    queue: `gs-queue.${GameResultsEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async GameResultsEvent(data: GameResultsEvent) {
    await this.cbus.execute(new SaveGameResultsCommand(data));
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: MatchFailedEvent.name,
    queue: `gs-queue.${MatchFailedEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async MatchFailedEvent(data: MatchFailedEvent) {
    await this.cbus.execute(new SaveMatchFailedCommand(data));
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: PlayerAbandonedEvent.name,
    queue: `gs-queue.${PlayerAbandonedEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async PlayerAbandonedEvent(data: PlayerAbandonedEvent) {
    await this.cbus.execute(new SavePlayerAbandonCommand(data));
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: MatchArtifactUploadedEvent.name,
    queue: `gs-queue.${MatchArtifactUploadedEvent.name}`,
  })
  async MatchArtifactUploadedEvent(data: MatchArtifactUploadedEvent) {
    this.logger.log('Handling uploaded artifact', data);
    if (data.artifactType === MatchArtifactType.REPLAY) {
      await this.cbus.execute(new AttachReplayCommand(data.matchId, data.lobbyType, `${data.bucket}/${data.key}`));
    }
  }

  @RabbitSubscribe({
    exchange: 'app.events',
    routingKey: PlayerDeclinedGameEvent.name,
    queue: `gs-queue.${PlayerDeclinedGameEvent.name}`,
    errorBehavior: MessageHandlerErrorBehavior.REQUEUE,
  })
  async PlayerDeclinedGameEvent(data: PlayerDeclinedGameEvent) {
    await this.cbus.execute(new CreateCrimeLogCommand(data.steamId, BanReason.GAME_DECLINE, data.mode));
  }
}
