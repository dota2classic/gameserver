import { Inject, Injectable } from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { ClientProxy } from '@nestjs/microservices';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { MatchCancelledEvent } from 'gateway/events/match-cancelled.event';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';
import { Cron } from '@nestjs/schedule';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { ServerActualizationRequestedEvent } from 'gateway/events/gs/server-actualization-requested.event';
import { KillServerRequestedEvent } from 'gateway/events/gs/kill-server-requested.event';
import { BanSystemEvent } from 'gateway/events/gs/ban-system.event';

@Injectable()
export class AppService {
  constructor(
    private readonly ebus: EventBus,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
    private readonly gsRepository: GameServerRepository,
  ) {}

  @Cron('*/30 * * * * *')
  async actualizeServers() {
    // for all servers
    // todo uncomment
    const all = await this.gsRepository.all();

    await Promise.all(
      all.map(async gs => {
        await this.ebus.publish(new ServerActualizationRequestedEvent(gs.url));
        await new Promise(r => setTimeout(r, 1000)) // spread them a little
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
      BanSystemEvent
    ];

    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe(t => this.redisEventQueue.emit(t.constructor.name, t));
  }
}
