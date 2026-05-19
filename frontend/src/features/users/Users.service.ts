import type { ZodType } from "zod";

import {
  apiPaginatedUsersTableSchema,
  apiUserSchema,
} from "@/features/users/schemas/Users.schema";
import type {
  SortDir,
  SortKey,
  UserListItem,
  UserMutationPayload,
} from "@/features/users/Users.types";
import { apiClient, toApiRequestError } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/pagination";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export const usersQueryKeys = {
  all: ["users-admin"] as const,
  table: (params: {
    page: number;
    pageSize?: number;
    search: string;
    sortKey: SortKey;
    sortDir: SortDir;
  }) => [...usersQueryKeys.all, "table", params] as const,
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

export const usersService = {
  getTablePage(
    params: {
      page: number;
      pageSize?: number;
      search: string;
      sortKey: SortKey;
      sortDir: SortDir;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<UserListItem>> {
    return requestJson(
      apiClient.get("/users/table", {
        signal,
        params: {
          page: params.page,
          page_size: params.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
          search: params.search,
          sort_key: params.sortKey,
          sort_dir: params.sortDir,
        },
      }),
      apiPaginatedUsersTableSchema,
      "La lista paginada de usuarios es invalida.",
    );
  },

  getUser(userId: number, signal?: AbortSignal) {
    return requestJson(
      apiClient.get(`/users/${userId}`, { signal }),
      apiUserSchema,
      "La respuesta del usuario es invalida.",
    );
  },

  createUser(payload: UserMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/users", payload, { signal }),
      apiUserSchema,
      "La respuesta del usuario es invalida.",
    );
  },

  updateUser(userId: number, payload: UserMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/users/${userId}`, payload, { signal }),
      apiUserSchema,
      "La respuesta del usuario es invalida.",
    );
  },

  deleteUser(userId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/users/${userId}`, { signal }), "No se pudo eliminar el usuario.");
  },
};
