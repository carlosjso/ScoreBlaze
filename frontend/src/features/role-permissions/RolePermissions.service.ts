import type { ZodType } from "zod";

import { apiRolePermissionMatrixSchema } from "@/features/role-permissions/schemas/RolePermissions.schema";
import type {
  RolePermissionMatrix,
  RolePermissionMutationPayload,
} from "@/features/role-permissions/RolePermissions.types";
import { apiClient, toApiRequestError } from "@/shared/api/client";

export const rolePermissionsQueryKeys = {
  all: ["role-permissions"] as const,
  matrix: (roleId: number) => [...rolePermissionsQueryKeys.all, "matrix", roleId] as const,
};

async function requestJson<T>(
  request: Promise<{ data: unknown }>,
  schema: ZodType<T>,
  invalidMessage: string,
): Promise<T> {
  try {
    const response = await request;
    return schema.parse(response.data);
  } catch (error) {
    throw toApiRequestError(error, invalidMessage);
  }
}

export const rolePermissionsService = {
  getMatrix(roleId: number, signal?: AbortSignal): Promise<RolePermissionMatrix> {
    return requestJson(
      apiClient.get(`/users/roles/${roleId}/permission-matrix`, { signal }),
      apiRolePermissionMatrixSchema,
      "La matriz de permisos del rol es invalida.",
    );
  },

  updateMatrix(
    roleId: number,
    payload: RolePermissionMutationPayload,
    signal?: AbortSignal,
  ): Promise<RolePermissionMatrix> {
    return requestJson(
      apiClient.put(`/users/roles/${roleId}/permission-matrix`, payload, { signal }),
      apiRolePermissionMatrixSchema,
      "La matriz de permisos del rol es invalida.",
    );
  },
};
