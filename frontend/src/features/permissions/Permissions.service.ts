import type { ZodType } from "zod";

import {
  apiPaginatedPermissionsTableSchema,
  apiPermissionSchema,
} from "@/features/permissions/schemas/Permissions.schema";
import type {
  PermissionListItem,
  PermissionMutationPayload,
  SortDir,
  SortKey,
} from "@/features/permissions/Permissions.types";
import { apiClient, toApiRequestError } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/pagination";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export const permissionsQueryKeys = {
  all: ["permissions"] as const,
  table: (params: {
    page: number;
    pageSize?: number;
    search: string;
    sortKey: SortKey;
    sortDir: SortDir;
  }) => [...permissionsQueryKeys.all, "table", params] as const,
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

export const permissionsService = {
  getTablePage(
    params: {
      page: number;
      pageSize?: number;
      search: string;
      sortKey: SortKey;
      sortDir: SortDir;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<PermissionListItem>> {
    return requestJson(
      apiClient.get("/users/permissions/table", {
        signal,
        params: {
          page: params.page,
          page_size: params.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
          search: params.search,
          sort_key: params.sortKey,
          sort_dir: params.sortDir,
        },
      }),
      apiPaginatedPermissionsTableSchema,
      "La lista paginada de permisos es invalida.",
    );
  },

  getPermission(permissionId: number, signal?: AbortSignal) {
    return requestJson(
      apiClient.get(`/users/permissions/${permissionId}`, { signal }),
      apiPermissionSchema,
      "La respuesta del permiso es invalida.",
    );
  },

  createPermission(payload: PermissionMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/users/permissions", payload, { signal }),
      apiPermissionSchema,
      "La respuesta del permiso es invalida.",
    );
  },

  updatePermission(permissionId: number, payload: PermissionMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/users/permissions/${permissionId}`, payload, { signal }),
      apiPermissionSchema,
      "La respuesta del permiso es invalida.",
    );
  },

  deletePermission(permissionId: number, signal?: AbortSignal) {
    return requestVoid(
      apiClient.delete(`/users/permissions/${permissionId}`, { signal }),
      "No se pudo eliminar el permiso.",
    );
  },
};
