import type { ZodType } from "zod";

import { apiClient, getApiErrorMessage } from "@/shared/api/client";
import type { MatchMutationPayload, QuickMatchesSnapshot } from "@/features/quick-matches/QuickMatches.types";
import {
  apiMatchesSchema,
  apiMatchSchema,
  apiTeamsOptionsSchema,
} from "@/features/quick-matches/schemas/QuickMatches.schema";

export const quickMatchesQueryKeys = {
  all: ["quick-matches"] as const,
  snapshot: () => [...quickMatchesQueryKeys.all, "snapshot"] as const,
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

export const quickMatchesService = {
  async getSnapshot(signal?: AbortSignal): Promise<QuickMatchesSnapshot> {
    const [matches, teams] = await Promise.all([
      requestJson(apiClient.get("/matches/", { signal }), apiMatchesSchema, "La lista de partidos es invalida."),
      requestJson(apiClient.get("/teams/", { signal }), apiTeamsOptionsSchema, "La lista de equipos es invalida."),
    ]);

    return { matches, teams };
  },

  createMatch(payload: MatchMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/matches/", payload, { signal }),
      apiMatchSchema,
      "La respuesta del partido es invalida."
    );
  },

  updateMatch(matchId: number, payload: MatchMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(`/matches/${matchId}`, payload, { signal }),
      apiMatchSchema,
      "La respuesta del partido es invalida."
    );
  },

  deleteMatch(matchId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/matches/${matchId}`, { signal }), "No se pudo eliminar el partido.");
  },
};

