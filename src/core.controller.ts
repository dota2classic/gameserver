import { EventPattern } from '@nestjs/microservices';
import { Controller, Logger } from '@nestjs/common';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { Constructor, EventBus } from '@nestjs/cqrs';
import { GameServerNotStartedEvent, GameServerStartedEvent } from 'gateway/events/game-server-started.event';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { PlayerBanHammeredEvent } from 'gateway/events/bans/player-ban-hammered.event';
import { ServerSessionSyncEvent } from 'gateway/events/gs/server-session-sync.event';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { PlayerDeclinedGameEvent } from 'gateway/events/mm/player-declined-game.event';
import { isDev } from 'env';
import { TournamentGameReadyEvent } from 'gateway/events/tournament/tournament-game-ready.event';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { StartFakeMatchEvent } from 'gateway/events/start-fake-match.event';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';

export enum Dota_GameState {
  DOTA_GAMERULES_STATE_INIT = 0,
  DOTA_GAMERULES_STATE_WAIT_FOR_PLAYERS_TO_LOAD = 1,
  DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP = 2,
  DOTA_GAMERULES_STATE_HERO_SELECTION = 3,
  DOTA_GAMERULES_STATE_STRATEGY_TIME = 4,
  DOTA_GAMERULES_STATE_TEAM_SHOWCASE = 5,
  DOTA_GAMERULES_STATE_PRE_GAME = 6,
  DOTA_GAMERULES_STATE_GAME_IN_PROGRESS = 7,
  DOTA_GAMERULES_STATE_POST_GAME = 8,
  DOTA_GAMERULES_STATE_DISCONNECT = 9,
}

class UpdateServerDTO {
  constructor(
    public readonly url: string,
    public readonly state: Dota_GameState,
    public readonly matchId: number,
  ) {}
}

@Controller()
export class CoreController {
  constructor(private readonly ebus: EventBus) {}
  private readonly logger = new Logger(CoreController.name);

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    if (!isDev) this.ebus.publish(buff);
  }
  @EventPattern(RoomReadyEvent.name)
  async RoomReadyEvent(data: RoomReadyEvent) {
    this.event(RoomReadyEvent, data);
  }


  @EventPattern(TournamentGameReadyEvent.name)
  async TournamentGameReadyEvent(data: TournamentGameReadyEvent) {
    this.event(TournamentGameReadyEvent, data);
  }

  @EventPattern(GameServerStartedEvent.name)
  async GameServerStartedEvent(data: GameServerStartedEvent) {
    this.event(GameServerStartedEvent, data);
  }

  @EventPattern(GameServerNotStartedEvent.name)
  async GameServerNotStartedEvent(data: GameServerNotStartedEvent) {
    this.event(GameServerNotStartedEvent, data);
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

  @EventPattern(GameResultsEvent.name)
  async GameResultsEvent(data: GameResultsEvent) {
    this.event(GameResultsEvent, data);
  }

  @EventPattern(PlayerBanHammeredEvent.name)
  async PlayerBanHammeredEvent(data: PlayerBanHammeredEvent) {
    this.event(PlayerBanHammeredEvent, data);
  }

  @EventPattern(PlayerDeclinedGameEvent.name)
  async PlayerDeclinedGameEvent(data: PlayerDeclinedGameEvent) {
    this.event(PlayerDeclinedGameEvent, data);
  }

  @EventPattern(PlayerNotLoadedEvent.name)
  async PlayerNotLoadedEvent(data: PlayerNotLoadedEvent) {
    this.event(PlayerNotLoadedEvent, data);
  }


  @EventPattern(LiveMatchUpdateEvent.name)
  async LiveMatchUpdateEvent(data: LiveMatchUpdateEvent) {
    this.event(LiveMatchUpdateEvent, data);
  }

  @EventPattern(StartFakeMatchEvent.name)
  async StartFakeMatchEvent(data: StartFakeMatchEvent) {
    this.event(StartFakeMatchEvent, data);
  }

  @EventPattern(ServerStatusEvent.name)
  async ServerStatusEvent(data: ServerStatusEvent) {
    this.event(ServerStatusEvent, data);
  }
}
