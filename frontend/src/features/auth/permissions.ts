import type { AuthSession } from "@/features/auth/Auth.types";

const SUPERADMIN_ROLE_NAME = "superadmin";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function hasRole(session: AuthSession | null, roleName: string) {
  const normalizedRole = normalize(roleName);
  return Boolean(session?.user.roles.some((role) => normalize(role) === normalizedRole));
}

export function hasPermission(session: AuthSession | null, permissionName: string) {
  if (!session) return false;
  if (hasRole(session, SUPERADMIN_ROLE_NAME)) return true;

  const normalizedPermission = normalize(permissionName);
  return session.user.permissions.some((permission) => normalize(permission) === normalizedPermission);
}

export function hasAllPermissions(session: AuthSession | null, permissionNames: readonly string[]) {
  return permissionNames.every((permissionName) => hasPermission(session, permissionName));
}

export function hasAnyPermission(session: AuthSession | null, permissionNames: readonly string[]) {
  return permissionNames.some((permissionName) => hasPermission(session, permissionName));
}

const authorizedEntryPoints: Array<{ path: string; permissions: readonly string[] }> = [
  { path: "/dashboard", permissions: ["dashboard.view"] },
  { path: "/players", permissions: ["players.view"] },
  { path: "/teams", permissions: ["teams.view"] },
  { path: "/quick-match", permissions: ["quick_match.view"] },
  { path: "/leagues", permissions: ["leagues.view"] },
  { path: "/settings/roles", permissions: ["roles.view"] },
  { path: "/settings/permissions", permissions: ["permissions.view"] },
  { path: "/settings/users", permissions: ["users.view"] },
];

const basketballEntryPoints: Array<{ path: string; permissions: readonly string[] }> = [
  { path: "/players", permissions: ["players.view"] },
  { path: "/teams", permissions: ["teams.view"] },
  { path: "/quick-match", permissions: ["quick_match.view"] },
  { path: "/leagues", permissions: ["leagues.view"] },
];

export function getFirstAllowedPath(session: AuthSession | null) {
  return authorizedEntryPoints.find((entry) => hasAllPermissions(session, entry.permissions))?.path ?? null;
}

export function getFirstAllowedBasketballPath(session: AuthSession | null) {
  return basketballEntryPoints.find((entry) => hasAllPermissions(session, entry.permissions))?.path ?? null;
}
