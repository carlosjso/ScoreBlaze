import type { ZodType } from "zod";

import { apiClient, getApiErrorMessage } from "@/shared/api/client";
import type { PlayerMutationPayload, PlayersSnapshot } from "@/features/players/Players.types";
import {
  apiPlayerSchema,
  apiPlayersSchema,
  apiTeamMembershipsSchema,
  apiTeamsSchema,
} from "@/features/players/schemas/Players.schema";

export const playersQueryKeys = {
  all: ["players"] as const,
  snapshot: () => [...playersQueryKeys.all, "snapshot"] as const,
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
    throw new Error(getApiErrorMessage(error, invalidMessage));
  }
}

async function requestVoid(request: Promise<unknown>, fallbackMessage: string): Promise<void> {
  try {
    await request;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallbackMessage));
  }
}

export const playersService = {
  async getSnapshot(signal?: AbortSignal): Promise<PlayersSnapshot> {
    const [players, teams, memberships] = await Promise.all([
      requestJson(apiClient.get("/players/", { signal }), apiPlayersSchema, "La lista de jugadores es invalida."),
      requestJson(apiClient.get("/teams/", { signal }), apiTeamsSchema, "La lista de equipos es invalida."),
      requestJson(
        apiClient.get("/team-memberships/", { signal }),
        apiTeamMembershipsSchema,
        "La lista de membresias es invalida."
      ),
    ]);

    return { players, teams, memberships };
  },

  createPlayer(payload: PlayerMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/players/", payload, { signal }),
      apiPlayerSchema,
      "La respuesta del jugador es invalida."
    );
  },

  updatePlayer(playerId: number, payload: PlayerMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/players/${playerId}`, payload, { signal }),
      apiPlayerSchema,
      "La respuesta del jugador es invalida."
    );
  },

  deletePlayer(playerId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/players/${playerId}`, { signal }), "No se pudo eliminar el jugador.");
  },
};

