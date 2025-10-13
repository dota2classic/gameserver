import { Role } from '../../gateway/shared-types/roles';

export type ForumRole = Role;

export function ForumRoleFromJSON(json: any): Role {
  return ForumRoleFromJSONTyped(json, false);
}

export function ForumRoleFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): Role {
  return json as Role;
}

export function ForumRoleToJSON(value?: Role | null): any {
  return value as any;
}
