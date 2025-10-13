import { MatchmakingMode as M2 } from '../../gateway/shared-types/matchmaking-mode';

export type MatchmakerMatchmakingMode = M2;

export function MatchmakerMatchmakingModeFromJSON(json: any): M2 {
  return MatchmakerMatchmakingModeFromJSONTyped(json, false);
}

export function MatchmakerMatchmakingModeFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): M2 {
  return json as M2;
}

export function MatchmakerMatchmakingModeToJSON(value?: M2 | null): any {
  return value as any;
}
