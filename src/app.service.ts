import { Inject, Injectable } from '@nestjs/common';
import { EventBus, ofType } from '@nestjs/cqrs';
import { ClientProxy } from '@nestjs/microservices';
import { MatchCreatedEvent } from 'gameserver/event/match-created.event';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';

@Injectable()
export class AppService {
  constructor(
    private readonly ebus: EventBus,
    @Inject("QueryCore") private readonly redisEventQueue: ClientProxy,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.redisEventQueue.connect();
    } catch (e) {}

    const publicEvents: any[] = [
      GameSessionCreatedEvent,
      DiscoveryRequestedEvent
    ];
    this.ebus
      .pipe(ofType(...publicEvents))
      .subscribe(t => this.redisEventQueue.emit(t.constructor.name, t));
  }
}