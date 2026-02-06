import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { ClientProxy } from '@nestjs/microservices';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { MatchCancelledEvent } from 'gateway/events/match-cancelled.event';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';
import { ServerActualizationRequestedEvent } from 'gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'gateway/events/gs/kill-server-requested.event';
import { BanSystemEvent } from 'gateway/events/gs/ban-system.event';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { AchievementCompleteEvent } from 'gateway/events/gs/achievement-complete.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { PlayerSmurfDetectedEvent } from 'gateway/events/bans/player-smurf-detected.event';
import { MatchRecordedEvent } from 'gateway/events/gs/match-recorded.event';
import { PlayerReportBanCreatedEvent } from 'gateway/events/bans/player-report-ban-created.event';
import { RunRconCommand } from 'gateway/commands/RunRcon/run-rcon.command';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { PlayerFeedbackCreatedEvent } from 'gateway/events/player-feedback-created.event';
import { LaunchGameServerCommand } from 'gateway/commands/LaunchGameServer/launch-game-server.command';
import { PlayerFinishedMatchEvent } from 'gateway/events/gs/player-finished-match.event';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private logger = new Logger(AppService.name);

  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionEntityRepository: Repository<GameServerSessionEntity>,
    @Inject("QueryCore") private readonly redisEventQueue: ClientProxy,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.redisEventQueue.connect();
    } catch (e) {}

    const publicEvents: any[] = [
      GameSessionCreatedEvent,
      DiscoveryRequestedEvent,
      MatchStartedEvent,
      MatchCancelledEvent,
      MatchFinishedEvent,
      ServerActualizationRequestedEvent,
      KillServerRequestedEvent,
      BanSystemEvent,
      PlayerReportBanCreatedEvent,
      MatchRecordedEvent,
      RunRconCommand,
    ];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe((t) => this.redisEventQueue.emit(t.constructor.name, t));

    this.ebus
      .pipe(
        ofType<any, any>(
          PlayerNotLoadedEvent,
          PlayerFeedbackCreatedEvent,
          PlayerSmurfDetectedEvent,
          PlayerFinishedMatchEvent,
          AchievementCompleteEvent,
        ),
      )
      .subscribe((msg) =>
        this.amqpConnection
          .publish("app.events", msg.constructor.name, msg)
          .then(() =>
            this.logger.log(`Published RMQ event ${msg.constructor.name}`),
          ),
      );

    this.ebus
      .pipe(ofType(LaunchGameServerCommand))
      .subscribe((msg: LaunchGameServerCommand) =>
        this.amqpConnection
          .publish(
            "app.events",
            `${LaunchGameServerCommand.name}.${msg.region}`,
            msg,
          )
          .then(() =>
            this.logger.log(`Published RMQ event ${msg.constructor.name}`),
          ),
      );
  }
}
