import { z } from "zod";

import { apiRoleSchema } from "@/features/roles/schemas/Roles.schema";
import type {
  RolePermissionActionItem,
  RolePermissionMatrix,
  RolePermissionModuleItem,
  RolePermissionMutationPayload,
} from "@/features/role-permissions/RolePermissions.types";

export const apiRolePermissionActionSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    permission_name: z.string().trim().min(1),
    enabled: z.coerce.boolean(),
  })
  .transform(
    (action): RolePermissionActionItem => ({
      key: action.key,
      label: action.label,
      permissionName: action.permission_name,
      enabled: action.enabled,
    }),
  );

export const apiRolePermissionModuleSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1),
    allow_all: z.coerce.boolean(),
    permissions: z.array(apiRolePermissionActionSchema),
  })
  .transform(
    (module): RolePermissionModuleItem => ({
      key: module.key,
      label: module.label,
      description: module.description,
      allowAll: module.allow_all,
      permissions: module.permissions,
    }),
  );

export const apiRolePermissionMatrixSchema = z
  .object({
    role: apiRoleSchema,
    modules: z.array(apiRolePermissionModuleSchema),
  })
  .transform(
    (matrix): RolePermissionMatrix => ({
      role: matrix.role,
      modules: matrix.modules,
    }),
  );

export function toRolePermissionMutationPayload(permissionNames: string[]): RolePermissionMutationPayload {
  return {
    permission_names: permissionNames
      .map((permissionName) => permissionName.trim().toLowerCase())
      .filter((permissionName) => permissionName.length > 0),
  };
}
