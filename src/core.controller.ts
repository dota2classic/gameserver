// TODO: DEPRECATED — replaced by PlayerRedisListener (src/player/player-redis.listener.ts), ModerationRedisListener (src/moderation/moderation-redis.listener.ts), and SessionRedisListener (src/session/session-redis.listener.ts)
// This file is dead code and should be removed once the module refactoring is complete.
import { EventPattern } from "@nestjs/microservices";
import { Controller, Logger } from "@nestjs/common";
import { CommandBus, Constructor, EventBus } from "@nestjs/cqrs";
import { GameServerStoppedEvent } from "gateway/events/game-server-stopped.event";
import { GameServerDiscoveredEvent } from "gateway/events/game-server-discovered.event";
import { PlayerBanHammeredEvent } from "gateway/events/bans/player-ban-hammered.event";
import { TournamentGameReadyEvent } from "gateway/events/tournament/tournament-game-ready.event";
import { LiveMatchUpdateEvent } from "gateway/events/gs/live-match-update.event";
import { ServerStatusEvent } from "gateway/events/gs/server-status.event";
import { ConfigService } from "@nestjs/config";
import { PlayerConnectedEvent } from "gateway/events/srcds/player-connected.event";
import { UserMightExistEvent } from "gateway/events/user/user-might-exist.event";
import { MakeSureExistsCommand } from "gameserver/command/MakeSureExists/make-sure-exists.command";

@Controller()
export class CoreController {
  constructor(
    private readonly ebus: EventBus,
    private readonly cbus: CommandBus,
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

  @EventPattern(UserMightExistEvent.name)
  async UserMightExistEvent(data: UserMightExistEvent) {
    await this.cbus.execute(new MakeSureExistsCommand(data.id));
  }
}

