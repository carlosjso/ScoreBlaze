export type LeagueStatus = "En curso" | "Sin empezar" | "Finalizada";
export type SortKey = "id" | "name" | "status" | "teams";
export type SortDir = "asc" | "desc";
export type LeagueFormMode = "create" | "edit";

export const leagueTrackedStatOptions = ["Triples", "Asistencias", "Puntos", "Faltas"] as const;

export type LeagueTrackedStatOption = (typeof leagueTrackedStatOptions)[number];
export type LeagueTrackedStat = string;

export type ApiLeague = {
  id: number;
  name: string;
  responsible_name: string;
  responsible_email: string;
  category: string;
  status: LeagueStatus;
  start_date: string;
  end_date: string;
  logo_base64: string | null;
  tracked_stats: string[];
  team_ids: number[];
};

export type ApiLeagueTableRow = Omit<ApiLeague, "logo_base64"> & {
  team_count: number;
};

export type ApiLeagueTeamSummary = {
  id: number;
  name: string;
  logo_base64: string | null;
  responsible_name: string;
  responsible_email: string;
  player_count: number;
  players_label: string;
};

export type LeagueTeamSummary = {
  id: number;
  name: string;
  logoBase64: string | null;
  responsibleName: string;
  responsibleEmail: string;
  playerCount: number;
  playersLabel: string;
};

export type LeagueListItem = {
  id: number;
  name: string;
  responsibleName: string;
  responsibleEmail: string;
  category: string;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  logoBase64: string | null;
  trackedStats: string[];
  teamIds: number[];
  teamCount: number;
};

export type LeagueDetail = LeagueListItem & {
  teams: LeagueTeamSummary[];
  matchesCount: number;
};

export type League = LeagueListItem;

export type LeagueFormValues = {
  name: string;
  responsibleName: string;
  responsibleEmail: string;
  category: string;
  status: LeagueStatus;
  startDate: string;
  endDate: string;
  logoBase64: string | null;
  trackedStats: string[];
  teamIds: number[];
};

export type LeagueMutationPayload = {
  name: string;
  responsible_name: string;
  responsible_email: string;
  category: string;
  status: LeagueStatus;
  start_date: string;
  end_date: string;
  logo_base64: string | null;
  tracked_stats: string[];
  team_ids: number[];
};

export function sanitizeLeagueTeamIds(teamIds: number[]): number[] {
  const seen = new Set<number>();
  const normalizedTeamIds: number[] = [];

  teamIds.forEach((teamId) => {
    if (seen.has(teamId)) {
      return;
    }

    seen.add(teamId);
    normalizedTeamIds.push(teamId);
  });

  return normalizedTeamIds;
}

export function normalizeLeagueTrackedStats(trackedStats: string[]): string[] {
  const seen = new Set<string>();
  const normalizedTrackedStats: string[] = [];

  trackedStats.forEach((stat) => {
    const normalizedStat = stat.trim().replace(/\s+/g, " ");

    if (!normalizedStat || seen.has(normalizedStat)) {
      return;
    }

    seen.add(normalizedStat);
    normalizedTrackedStats.push(normalizedStat);
  });

  return normalizedTrackedStats.length > 0 ? normalizedTrackedStats : [...leagueTrackedStatOptions];
}
