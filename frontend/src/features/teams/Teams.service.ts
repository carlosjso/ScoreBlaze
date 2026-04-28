import type { ZodType } from "zod";

import { apiClient, getApiErrorMessage } from "@/shared/api/client";
import type { TeamMutationPayload, TeamsSnapshot } from "@/features/teams/Teams.types";
import {
  apiPlayersSchema,
  apiTeamMembershipsSchema,
  apiTeamsSchema,
  apiTeamSchema,
} from "@/features/teams/schemas/Teams.schema";

export const teamsQueryKeys = {
  all: ["teams"] as const,
  snapshot: () => [...teamsQueryKeys.all, "snapshot"] as const,
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

export const teamsService = {
  async getSnapshot(signal?: AbortSignal): Promise<TeamsSnapshot> {
    const [teams, players, memberships] = await Promise.all([
      requestJson(apiClient.get("/teams/", { signal }), apiTeamsSchema, "La lista de equipos es invalida."),
      requestJson(apiClient.get("/players/", { signal }), apiPlayersSchema, "La lista de jugadores es invalida."),
      requestJson(
        apiClient.get("/team-memberships/", { signal }),
        apiTeamMembershipsSchema,
        "La lista de membresias es invalida."
      ),
    ]);

    return { teams, players, memberships };
  },

  createTeam(payload: TeamMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/teams/", payload, { signal }),
      apiTeamSchema,
      "La respuesta del equipo es invalida."
    );
  },

  updateTeam(teamId: number, payload: TeamMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/teams/${teamId}`, payload, { signal }),
      apiTeamSchema,
      "La respuesta del equipo es invalida."
    );
  },

  deleteTeam(teamId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/teams/${teamId}`, { signal }), "No se pudo eliminar el equipo.");
  },
};

