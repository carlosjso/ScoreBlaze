import type { ZodType } from "zod";

import { leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueDetail } from "@/features/leagues/Leagues.types";
import {
  apiMatchSchema,
  apiMatchesSchema,
} from "@/features/quick-matches/schemas/QuickMatches.schema";
import type {
  ApiMatch,
  ApiTeamOption,
  MatchMutationPayload,
} from "@/features/quick-matches/QuickMatches.types";
import { apiClient, toApiRequestError } from "@/shared/api/client";

export type LeagueMatchesSnapshot = {
  league: LeagueDetail;
  matches: ApiMatch[];
  teams: ApiTeamOption[];
};

export const leagueMatchesQueryKeys = {
  all: ["league-matches"] as const,
  snapshot: (leagueId: number) => [...leagueMatchesQueryKeys.all, "snapshot", leagueId] as const,
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

function toLeagueTeamOptions(league: LeagueDetail): ApiTeamOption[] {
  return league.teams.map((team) => ({
    id: team.id,
    name: team.name,
    logo_base64: team.logoBase64,
  }));
}

export const leagueMatchesService = {
  async getSnapshot(leagueId: number, signal?: AbortSignal): Promise<LeagueMatchesSnapshot> {
    const [league, matches] = await Promise.all([
      leaguesService.getLeague(leagueId, signal),
      requestJson(
        apiClient.get(`/api/leagues/${leagueId}/matches`, { signal }),
        apiMatchesSchema,
        "La lista de partidos de la liga es invalida.",
      ),
    ]);

    return {
      league,
      matches,
      teams: toLeagueTeamOptions(league),
    };
  },

  createMatch(leagueId: number, payload: MatchMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.post(
        "/matches/",
        {
          ...payload,
          league_id: leagueId,
        },
        { signal },
      ),
      apiMatchSchema,
      "La respuesta del partido es invalida.",
    );
  },

  updateMatch(matchId: number, leagueId: number, payload: MatchMutationPayload, signal?: AbortSignal) {
    return requestJson(
      apiClient.put(
        `/matches/${matchId}`,
        {
          ...payload,
          league_id: leagueId,
        },
        { signal },
      ),
      apiMatchSchema,
      "La respuesta del partido es invalida.",
    );
  },

  deleteMatch(matchId: number, signal?: AbortSignal) {
    return requestVoid(apiClient.delete(`/matches/${matchId}`, { signal }), "No se pudo eliminar el partido de la liga.");
  },
};
