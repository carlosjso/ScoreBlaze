import type { ZodType } from "zod";

import { apiClient, toApiRequestError } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/pagination";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import {
  apiLeagueDetailSchema,
  apiLeagueSchema,
  apiLeagueStatsSnapshotSchema,
  apiLeaguesSchema,
  apiPaginatedLeaguesTableSchema,
} from "@/features/leagues/schemas/Leagues.schema";
import type { LeagueDetail, LeagueListItem, LeagueMutationPayload, LeagueStatsSnapshot, SortDir, SortKey } from "@/features/leagues/Leagues.types";

export const leaguesQueryKeys = {
  all: ["leagues"] as const,
  catalog: () => [...leaguesQueryKeys.all, "catalog"] as const,
  detail: (leagueId: number) => [...leaguesQueryKeys.all, "detail", leagueId] as const,
  stats: (leagueId: number) => [...leaguesQueryKeys.all, "stats", leagueId] as const,
  table: (params: {
    page: number;
    pageSize?: number;
    search: string;
    sortKey: SortKey;
    sortDir: SortDir;
  }) => [...leaguesQueryKeys.all, "table", params] as const,
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

export const leaguesService = {
  getCatalog(signal?: AbortSignal): Promise<LeagueListItem[]> {
    return requestJson(apiClient.get("/api/leagues/", { signal }), apiLeaguesSchema, "La lista de ligas es invalida.");
  },

  getLeague(leagueId: number, signal?: AbortSignal): Promise<LeagueDetail> {
    return requestJson(
      apiClient.get(`/api/leagues/${leagueId}`, { signal }),
      apiLeagueDetailSchema,
      "El detalle de la liga es invalido.",
    );
  },

  getLeagueStats(leagueId: number, signal?: AbortSignal): Promise<LeagueStatsSnapshot> {
    return requestJson(
      apiClient.get(`/api/leagues/${leagueId}/stats`, { signal }),
      apiLeagueStatsSnapshotSchema,
      "Las estadisticas de la liga son invalidas.",
    );
  },

  getTablePage(
    params: {
      page: number;
      pageSize?: number;
      search: string;
      sortKey: SortKey;
      sortDir: SortDir;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<LeagueListItem>> {
    return requestJson(
      apiClient.get("/api/leagues/table", {
        signal,
        params: {
          page: params.page,
          page_size: params.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
          search: params.search,
          sort_key: params.sortKey,
          sort_dir: params.sortDir,
        },
      }),
      apiPaginatedLeaguesTableSchema,
      "La lista paginada de ligas es invalida.",
    );
  },

  createLeague(payload: LeagueMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/api/leagues/", payload, { signal }),
      apiLeagueSchema,
      "La respuesta de la liga es invalida.",
    );
  },

  updateLeague(leagueId: number, payload: LeagueMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/api/leagues/${leagueId}`, payload, { signal }),
      apiLeagueSchema,
      "La respuesta de la liga es invalida.",
    );
  },

  replaceLeagueTeams(leagueId: number, teamIds: number[], signal?: AbortSignal) {
    return requestJson(
      apiClient.put(
        `/api/leagues/${leagueId}/teams`,
        {
          team_ids: teamIds,
        },
        { signal },
      ),
      apiLeagueSchema,
      "La respuesta de la liga es invalida.",
    );
  },

  deleteLeague(leagueId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/api/leagues/${leagueId}`, { signal }), "No se pudo eliminar la liga.");
  },
};
