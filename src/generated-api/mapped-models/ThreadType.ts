import { ThreadType } from '../../gateway/shared-types/thread-type';

export type ForumThreadType = ThreadType;

export function ForumThreadTypeFromJSON(json: any): ThreadType {
  return ForumThreadTypeFromJSONTyped(json, false);
}

export function ForumThreadTypeFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ThreadType {
  return json as ThreadType;
}

export function ForumThreadTypeToJSON(value?: ThreadType | null): any {
  return value as any;
}
