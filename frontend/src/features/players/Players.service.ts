import type { ZodType } from "zod";

import { apiClient, toApiRequestError } from "@/shared/api/client";
import type { PaginatedResponse } from "@/shared/api/pagination";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import type { PlayerMutationPayload, PlayersSnapshot } from "@/features/players/Players.types";
import {
  apiPaginatedPlayersTableSchema,
  apiPlayerSchema,
  apiPlayersSchema,
  apiTeamMembershipsSchema,
  apiTeamsSchema,
} from "@/features/players/schemas/Players.schema";
import type { PlayerListItem, SortDir, SortKey, TeamFilterValue } from "@/features/players/Players.types";

export const playersQueryKeys = {
  all: ["players"] as const,
  snapshot: () => [...playersQueryKeys.all, "snapshot"] as const,
  table: (params: {
    page: number;
    pageSize?: number;
    search: string;
    teamFilter: TeamFilterValue;
    sortKey: SortKey;
    sortDir: SortDir;
  }) => [...playersQueryKeys.all, "table", params] as const,
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

export const playersService = {
  async getSnapshot(signal?: AbortSignal): Promise<PlayersSnapshot> {
    const [players, teams, memberships] = await Promise.all([
      requestJson(apiClient.get("/api/players/", { signal }), apiPlayersSchema, "La lista de jugadores es invalida."),
      requestJson(apiClient.get("/api/teams/", { signal }), apiTeamsSchema, "La lista de equipos es invalida."),
      requestJson(
        apiClient.get("/team-memberships/", { signal }),
        apiTeamMembershipsSchema,
        "La lista de membresias es invalida."
      ),
    ]);

    return { players, teams, memberships };
  },

  getTablePage(
    params: {
      page: number;
      pageSize?: number;
      search: string;
      teamFilter: TeamFilterValue;
      sortKey: SortKey;
      sortDir: SortDir;
    },
    signal?: AbortSignal,
  ): Promise<PaginatedResponse<PlayerListItem>> {
    return requestJson(
      apiClient.get("/api/players/table", {
        signal,
        params: {
          page: params.page,
          page_size: params.pageSize ?? DEFAULT_TABLE_PAGE_SIZE,
          search: params.search,
          team_filter: params.teamFilter,
          sort_key: params.sortKey,
          sort_dir: params.sortDir,
        },
      }),
      apiPaginatedPlayersTableSchema,
      "La lista paginada de jugadores es invalida.",
    );
  },

  createPlayer(payload: PlayerMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/api/players/", payload, { signal }),
      apiPlayerSchema,
      "La respuesta del jugador es invalida."
    );
  },

  updatePlayer(playerId: number, payload: PlayerMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/api/players/${playerId}`, payload, { signal }),
      apiPlayerSchema,
      "La respuesta del jugador es invalida."
    );
  },

  deletePlayer(playerId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/api/players/${playerId}`, { signal }), "No se pudo eliminar el jugador.");
  },
};

