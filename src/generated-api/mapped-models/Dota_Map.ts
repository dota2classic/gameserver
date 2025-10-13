import { Dota_Map } from '../../gateway/shared-types/dota-map';

export type GameserverDotaMap = Dota_Map;

export function GameserverDotaMapFromJSON(json: any): GameserverDotaMap {
  return GameserverDotaMapFromJSONTyped(json, false);
}

export function GameserverDotaMapFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): GameserverDotaMap {
  return json as GameserverDotaMap;
}

export function GameserverDotaMapToJSON(value?: GameserverDotaMap | null): any {
  return value as any;
}
