import { useQuery } from "@tanstack/react-query";

import { apiClient, toApiRequestError } from "@/shared/api/client";
import { apiMatchesSchema } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { apiTeamStatSchema } from "@/features/teams/schemas/Teams.schema";
import type { ApiTeamStat, TeamHistoricalStats } from "@/features/teams/Teams.types";
import { buildHistoricalTeamStats } from "@/features/teams/teamDetailStats";

async function getTeamStat(teamId: number, signal?: AbortSignal): Promise<ApiTeamStat | null> {
  try {
    const response = await apiClient.get(`/team-stats/${teamId}`, { signal });
    return apiTeamStatSchema.parse(response.data);
  } catch (error) {
    const normalizedError = toApiRequestError(error, "No se pudo cargar la estadistica historica del equipo.");
    if (normalizedError.status === 404) {
      return null;
    }

    throw normalizedError;
  }
}

async function getTeamHistoricalStats(teamId: number, signal?: AbortSignal): Promise<TeamHistoricalStats> {
  try {
    const [matchesResponse, teamStat] = await Promise.all([
      apiClient.get("/matches/", { signal }),
      getTeamStat(teamId, signal),
    ]);

    const matches = apiMatchesSchema.parse(matchesResponse.data);
    return buildHistoricalTeamStats(teamId, matches, teamStat);
  } catch (error) {
    throw toApiRequestError(error, "No se pudo cargar el resumen historico del equipo.");
  }
}

export function useTeamHistoricalStats(teamId: number | null) {
  return useQuery({
    queryKey: ["teams", "historical-stats", teamId] as const,
    enabled: Boolean(teamId),
    queryFn: ({ signal }) => getTeamHistoricalStats(teamId!, signal),
  });
}
