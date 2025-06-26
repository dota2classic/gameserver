import { MatchmakingMode as M2 } from '../../gateway/shared-types/matchmaking-mode';

export type GameserverMatchmakingMode = M2;

export function GameserverMatchmakingModeFromJSON(json: any): M2 {
  return GameserverMatchmakingModeFromJSONTyped(json, false);
}

export function GameserverMatchmakingModeFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): M2 {
  return json as M2;
}

export function GameserverMatchmakingModeToJSON(value?: M2 | null): any {
  return value as any;
}
