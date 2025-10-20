import { EventPattern } from '@nestjs/microservices';
import { Controller, Logger } from '@nestjs/common';
import { Constructor, EventBus } from '@nestjs/cqrs';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { PlayerBanHammeredEvent } from 'gateway/events/bans/player-ban-hammered.event';
import { ServerSessionSyncEvent } from 'gateway/events/gs/server-session-sync.event';
import { TournamentGameReadyEvent } from 'gateway/events/tournament/tournament-game-ready.event';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import { ConfigService } from '@nestjs/config';
import { PlayerConnectedEvent } from 'gateway/events/srcds/player-connected.event';

@Controller()
export class CoreController {
  constructor(
    private readonly ebus: EventBus,
    private readonly config: ConfigService,
  ) {}
  private readonly logger = new Logger(CoreController.name);

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
    this.event(GameServerStoppedEvent, data);
  }

  @EventPattern(ServerSessionSyncEvent.name)
  async ServerSessionSyncEvent(data: ServerSessionSyncEvent) {
    this.event(ServerSessionSyncEvent, data);
  }

  @EventPattern(GameServerDiscoveredEvent.name)
  async GameServerDiscoveredEvent(data: GameServerDiscoveredEvent) {
    this.event(GameServerDiscoveredEvent, data);
  }

  // TODO: convert to endpoint
  @EventPattern(PlayerBanHammeredEvent.name)
  async PlayerBanHammeredEvent(data: PlayerBanHammeredEvent) {
    this.event(PlayerBanHammeredEvent, data);
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
