import { Controller, Logger } from '@nestjs/common';
import { Constructor, EventBus } from '@nestjs/cqrs';
import { EventPattern } from '@nestjs/microservices';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { SessionEndedEvent } from 'gameserver/event/session-ended.event';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import { PlayerConnectedEvent } from 'gateway/events/srcds/player-connected.event';
import { TournamentGameReadyEvent } from 'gateway/events/tournament/tournament-game-ready.event';

@Controller()
export class SessionRedisListener {
  private readonly logger = new Logger(SessionRedisListener.name);

  constructor(private readonly ebus: EventBus) {}

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    this.ebus.publish(buff);
  }

  @EventPattern(TournamentGameReadyEvent.name)
  async TournamentGameReadyEvent(data: TournamentGameReadyEvent) {
    this.event(TournamentGameReadyEvent, data);
  }

  @EventPattern(GameServerStoppedEvent.name)
  async GameServerStoppedEvent(data: GameServerStoppedEvent) {
    this.ebus.publish(new SessionEndedEvent(data.url, 'CRASHED'));
  }

  @EventPattern(GameServerDiscoveredEvent.name)
  async GameServerDiscoveredEvent(data: GameServerDiscoveredEvent) {
    this.event(GameServerDiscoveredEvent, data);
  }

  @EventPattern(LiveMatchUpdateEvent.name)
  async LiveMatchUpdateEvent(data: LiveMatchUpdateEvent) {
    this.event(LiveMatchUpdateEvent, data);
  }

  @EventPattern(ServerStatusEvent.name)
  async ServerStatusEvent(data: ServerStatusEvent) {
    this.event(ServerStatusEvent, data);
  }

  @EventPattern(PlayerConnectedEvent.name)
  async PlayerConnectedEvent(data: PlayerConnectedEvent) {
    this.event(PlayerConnectedEvent, data);
  }
}
