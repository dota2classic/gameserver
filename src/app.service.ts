import { Inject, Injectable } from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { ClientProxy } from '@nestjs/microservices';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { MatchCancelledEvent } from 'gateway/events/match-cancelled.event';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';
import { Cron } from '@nestjs/schedule';
import { ServerActualizationRequestedEvent } from 'gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'gateway/events/gs/kill-server-requested.event';
import { BanSystemEvent } from 'gateway/events/gs/ban-system.event';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { AchievementCompleteEvent } from 'gateway/events/gs/achievement-complete.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { PlayerSmurfDetectedEvent } from 'gateway/events/bans/player-smurf-detected.event';
import { MatchRecordedEvent } from 'gateway/events/gs/match-recorded.event';
import { PlayerReportBanCreatedEvent } from 'gateway/events/bans/player-report-ban-created.event';
import { PlayerFeedbackCreatedEvent } from 'gateway/events/player-feedback-created.event';

@Injectable()
export class AppService {
  constructor(
    private readonly ebus: EventBus,
    @InjectRepository(GameServerEntity)
    private readonly gameServerEntityRepository: Repository<GameServerEntity>,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionEntityRepository: Repository<GameServerSessionEntity>,
    @Inject("QueryCore") private readonly redisEventQueue: ClientProxy,
  ) {}

  @Cron("*/30 * * * * *")
  async actualizeServers() {
    // for all servers
    const all = await this.gameServerEntityRepository.find();

    const all2 = await this.gameServerSessionEntityRepository.find();

    await Promise.all(
      all.map(async (gs) => {
        await this.ebus.publish(new ServerActualizationRequestedEvent(gs.url));
      }),
    );

    await Promise.all(
      all2.map(async (gs) => {
        await this.ebus.publish(new ServerActualizationRequestedEvent(gs.url));
      }),
    );
  }

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
      PlayerNotLoadedEvent,
      PlayerReportBanCreatedEvent,
      AchievementCompleteEvent,
      PlayerSmurfDetectedEvent,
      MatchRecordedEvent,
      PlayerFeedbackCreatedEvent
    ];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe((t) => this.redisEventQueue.emit(t.constructor.name, t));
  }
}
