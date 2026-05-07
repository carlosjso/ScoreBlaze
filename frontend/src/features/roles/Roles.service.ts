import type { ZodType } from "zod";

import type { RoleMutationPayload, RoleListItem, SortDir, SortKey } from "@/features/roles/Roles.types";
import { apiPaginatedRolesTableSchema, apiRoleSchema } from "@/features/roles/schemas/Roles.schema";
import { apiClient, toApiRequestError } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/pagination";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export const rolesQueryKeys = {
  all: ["roles"] as const,
  table: (params: {
    page: number;
    pageSize?: number;
    search: string;
    sortKey: SortKey;
    sortDir: SortDir;
  }) => [...rolesQueryKeys.all, "table", params] as const,
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

async function requestVoid(request: Promise<unknown>, fallbackMessage: string): Promise<void> {
  try {
    await request;
  } catch (error) {
    throw toApiRequestError(error, fallbackMessage);
  }
}

export const rolesService = {
  getTablePage(
    params: {
      page: number;
      pageSize?: number;
      search: string;
      sortKey: SortKey;
      sortDir: SortDir;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<RoleListItem>> {
    return requestJson(
      apiClient.get("/users/roles/table", {
        signal,
        params: {
          page: params.page,
          page_size: params.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
          search: params.search,
          sort_key: params.sortKey,
          sort_dir: params.sortDir,
        },
      }),
      apiPaginatedRolesTableSchema,
      "La lista paginada de roles es invalida.",
    );
  },

  getRole(roleId: number, signal?: AbortSignal) {
    return requestJson(
      apiClient.get(`/users/roles/${roleId}`, { signal }),
      apiRoleSchema,
      "La respuesta del rol es invalida.",
    );
  },

  createRole(payload: RoleMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/users/roles", payload, { signal }),
      apiRoleSchema,
      "La respuesta del rol es invalida.",
    );
  },

  updateRole(roleId: number, payload: RoleMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/users/roles/${roleId}`, payload, { signal }),
      apiRoleSchema,
      "La respuesta del rol es invalida.",
    );
  },

  deleteRole(roleId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/users/roles/${roleId}`, { signal }), "No se pudo eliminar el rol.");
  },
};
