import type { ZodType } from "zod";

import { apiClient, toApiRequestError } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/pagination";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { TeamMutationPayload, TeamsSnapshot } from "@/features/teams/Teams.types";
import {
  apiPaginatedTeamsTableSchema,
  apiPlayersSchema,
  apiTeamMembershipsSchema,
  apiTeamsSchema,
  apiTeamSchema,
} from "@/features/teams/schemas/Teams.schema";
import type { SortDir, SortKey, TeamListItem } from "@/features/teams/Teams.types";

export const teamsQueryKeys = {
  all: ["teams"] as const,
  snapshot: () => [...teamsQueryKeys.all, "snapshot"] as const,
  catalog: () => [...teamsQueryKeys.all, "catalog"] as const,
  table: (params: {
    page: number;
    pageSize?: number;
    search: string;
    sortKey: SortKey;
    sortDir: SortDir;
  }) => [...teamsQueryKeys.all, "table", params] as const,
};

async function requestJson<T>(
  request: Promise<{ data: unknown }>,
  schema: ZodType<T>,
  invalidMessage: string
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

export const teamsService = {
  getCatalog(signal?: AbortSignal) {
    return requestJson(apiClient.get("/api/teams/", { signal }), apiTeamsSchema, "La lista de equipos es invalida.");
  },

  async getSnapshot(signal?: AbortSignal): Promise<TeamsSnapshot> {
    const [teams, players, memberships] = await Promise.all([
      teamsService.getCatalog(signal),
      requestJson(apiClient.get("/api/players/", { signal }), apiPlayersSchema, "La lista de jugadores es invalida."),
      requestJson(
        apiClient.get("/team-memberships/", { signal }),
        apiTeamMembershipsSchema,
        "La lista de membresias es invalida."
      ),
    ]);

    return { teams, players, memberships };
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
  ): Promise<PaginatedResponse<TeamListItem>> {
    return requestJson(
      apiClient.get("/api/teams/table", {
        signal,
        params: {
          page: params.page,
          page_size: params.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
          search: params.search,
          sort_key: params.sortKey,
          sort_dir: params.sortDir,
        },
      }),
      apiPaginatedTeamsTableSchema,
      "La lista paginada de equipos es invalida.",
    );
  },

  createTeam(payload: TeamMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/api/teams/", payload, { signal }),
      apiTeamSchema,
      "La respuesta del equipo es invalida."
    );
  },

  updateTeam(teamId: number, payload: TeamMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/api/teams/${teamId}`, payload, { signal }),
      apiTeamSchema,
      "La respuesta del equipo es invalida."
    );
  },

  deleteTeam(teamId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/api/teams/${teamId}`, { signal }), "No se pudo eliminar el equipo.");
  },
};

