import { PlayerAspect } from '../../gateway/shared-types/player-aspect';

export type GameserverPlayerAspect = PlayerAspect;

export function GameserverPlayerAspectFromJSON(json: any): PlayerAspect {
  return GameserverPlayerAspectFromJSONTyped(json, false);
}

export function GameserverPlayerAspectFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PlayerAspect {
  return json as PlayerAspect;
}

export function GameserverPlayerAspectToJSON(value?: PlayerAspect | null): any {
  return value as any;
}
