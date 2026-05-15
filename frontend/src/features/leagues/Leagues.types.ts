export type LeagueStatus = "En curso" | "Sin empezar" | "Finalizada";
export type SortKey = "id" | "name" | "status" | "teams";
export type SortDir = "asc" | "desc";
export type LeagueFormMode = "create" | "edit";

export const leagueTrackedStatOptions = ["Fallo", "Faltas", "Asistencias", "Rebotes"] as const;

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

export type ApiLeagueTableRow = ApiLeague & {
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

export type LeagueLeaderSummary = {
  teamId: number | null;
  teamName: string | null;
  value: number;
};

export type LeagueStatsOverview = {
  teamsCount: number;
  totalMatches: number;
  scheduledMatches: number;
  liveMatches: number;
  finishedMatches: number;
  champion: LeagueLeaderSummary | null;
};

export type LeagueTeamLeaders = {
  topOffense: LeagueLeaderSummary | null;
  bestDefense: LeagueLeaderSummary | null;
  mostWins: LeagueLeaderSummary | null;
};

export type LeaguePlayerRankingRow = {
  position: number;
  playerId: number;
  playerName: string;
  teamId: number | null;
  teamName: string | null;
  matchesPlayed: number;
  totalPoints: number;
  made1pt: number;
  made2pt: number;
  made3pt: number;
  missedShots: number;
  totalAssists: number;
  totalRebounds: number;
  totalFouls: number;
};

export type LeagueStandingRow = {
  position: number;
  teamId: number;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  pointsDifference: number;
  standingsPoints: number;
  totalTeamFouls: number;
};

export type LeagueStatsSnapshot = {
  leagueId: number;
  leagueName: string;
  leagueStatus: LeagueStatus;
  trackedStats: string[];
  overview: LeagueStatsOverview;
  teamLeaders: LeagueTeamLeaders;
  standings: LeagueStandingRow[];
  playerRankings: LeaguePlayerRankingRow[];
  updatedAt: string;
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
  const allowedStats = new Set<string>(leagueTrackedStatOptions);

  trackedStats.forEach((stat) => {
    const normalizedStat = stat.trim().replace(/\s+/g, " ");

    if (!normalizedStat || seen.has(normalizedStat) || !allowedStats.has(normalizedStat)) {
      return;
    }

    seen.add(normalizedStat);
    normalizedTrackedStats.push(normalizedStat);
  });

  return normalizedTrackedStats.length > 0 ? normalizedTrackedStats : [...leagueTrackedStatOptions];
}
