import { MatchAccessLevel } from '../../gateway/shared-types/match-access-level';

export type GameserverMatchAccessLevel = MatchAccessLevel;

export function GameserverMatchAccessLevelFromJSON(
  json: any,
): GameserverMatchAccessLevel {
  return GameserverMatchAccessLevelFromJSONTyped(json, false);
}

export function GameserverMatchAccessLevelFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): GameserverMatchAccessLevel {
  return json as GameserverMatchAccessLevel;
}

export function GameserverMatchAccessLevelToJSON(
  value?: GameserverMatchAccessLevel | null,
): any {
  return value as any;
}
