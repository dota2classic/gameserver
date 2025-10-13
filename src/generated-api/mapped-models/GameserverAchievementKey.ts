import { AchievementKey } from '../../gateway/shared-types/achievemen-key';

export type GameserverAchievementKey = AchievementKey;

export function GameserverAchievementKeyFromJSON(
  json: any,
): GameserverAchievementKey {
  return GameserverAchievementKeyFromJSONTyped(json, false);
}

export function GameserverAchievementKeyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): GameserverAchievementKey {
  return json as GameserverAchievementKey;
}

export function GameserverAchievementKeyToJSON(
  value?: GameserverAchievementKey | null,
): any {
  return value as any;
}
