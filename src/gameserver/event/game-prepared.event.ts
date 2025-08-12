import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { Dota_Map } from 'gateway/shared-types/dota-map';
import { MatchPlayer } from 'gateway/events/room-ready.event';
import { DotaPatch } from 'gateway/constants/patch';

export class GamePreparedEvent {
  constructor(
    public readonly mode: MatchmakingMode,
    public readonly gameMode: Dota_GameMode,
    public readonly map: Dota_Map,
    public readonly version: Dota2Version,
    public readonly roomId: string,
    public readonly players: MatchPlayer[],
    public readonly enableCheats: boolean,
    public readonly fillBots: boolean,
    public readonly patch: DotaPatch
  ) {}
}
