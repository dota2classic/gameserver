import { EventPattern } from '@nestjs/microservices';
import { Body, Controller, Logger, Post } from '@nestjs/common';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { inspect } from 'util';
import { Constructor, EventBus } from '@nestjs/cqrs';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerStartedEvent } from 'gateway/events/game-server-started.event';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';

export enum GameState {
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
    public readonly state: GameState,
    public readonly matchId: number,
    public readonly mode: MatchmakingMode,
  ) {}
}

@Controller()
export class CoreController {
  constructor(private readonly ebus: EventBus) {}
  private readonly logger = new Logger(CoreController.name);

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    this.ebus.publish(buff);
  }
  @EventPattern(RoomReadyEvent.name)
  async RoomReadyEvent(data: RoomReadyEvent) {
    console.log(`Room readY????`);
    this.event(RoomReadyEvent, data);
  }


  @EventPattern(GameServerStartedEvent.name)
  async GameServerStartedEvent(data: GameServerStartedEvent) {
    console.log(`SERVER STARTED YAHOO`);
    this.event(GameServerStartedEvent, data);
  }

  @EventPattern(GameServerStoppedEvent.name)
  async GameServerStoppedEvent(data: GameServerStoppedEvent) {
    this.event(GameServerStoppedEvent, data);
  }

  @Post('server_update')
  async updateGameServer(@Body() dto: UpdateServerDTO) {

  }
}
