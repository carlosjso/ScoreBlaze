export type LeagueStatus = "En curso" | "Sin empezar" | "Finalizada";
export type SortKey = "id" | "name" | "status" | "teams";
export type SortDir = "asc" | "desc";
export type LeagueFormMode = "create" | "edit";
export type CompetitionType = "LEAGUE" | "ELIMINATION";

export const leagueTrackedStatOptions = ["Fallo", "Faltas", "Asistencias", "Rebotes"] as const;
export const leagueFinalPhasePresetOptions = [
  "TOP_4_SINGLE_GAME",
  "TOP_8_SINGLE_GAME",
  "TOP_8_HOME_AWAY",
  "TOP_6_SINGLE_GAME_WITH_BYES",
  "TOP_16_SINGLE_GAME",
  "TOP_32_SINGLE_GAME",
  "NBA_PLAY_IN_TOP_10",
  "DOUBLE_ELIMINATION_TOP_8",
  "DOUBLE_ELIMINATION_TOP_16",
  "CUSTOM",
] as const;
export const leagueFinalPhaseQualifiedTeamsOptions = [2, 4, 6, 8, 10, 12, 14, 16, 24, 32] as const;
export const leagueFinalPhaseBestOfOptions = [1, 3, 5, 7] as const;

export type LeagueTrackedStatOption = (typeof leagueTrackedStatOptions)[number];
export type LeagueTrackedStat = string;
export type LeagueFinalPhasePresetOption = (typeof leagueFinalPhasePresetOptions)[number];
export type LeagueFinalPhaseFormatOption = "SINGLE_ELIMINATION" | "DOUBLE_ELIMINATION" | "PLAY_IN_PLUS_BRACKET";

export type ApiLeague = {
  id: number;
  name: string;
  responsible_name: string;
  responsible_email: string;
  category: string;
  status: LeagueStatus;
  competition_type: CompetitionType;
  start_date: string;
  end_date: string;
  logo_base64: string | null;
  tracked_stats: string[];
  final_phase_enabled: boolean;
  final_phase_preset: LeagueFinalPhasePresetOption;
  final_phase_qualified_teams: number;
  final_phase_byes: number;
  final_phase_format: LeagueFinalPhaseFormatOption;
  final_phase_two_legs: boolean;
  final_phase_third_place_match: boolean;
  final_phase_seeded_home_advantage: boolean;
  final_phase_play_in_slots: number;
  final_phase_round_best_of: number;
  final_phase_final_best_of: number;
  final_phase_reseed_each_round: boolean;
  final_phase_grand_final_reset: boolean;
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
  competitionType: CompetitionType;
  startDate: string;
  endDate: string;
  logoBase64: string | null;
  trackedStats: string[];
  finalPhaseEnabled: boolean;
  finalPhasePreset: LeagueFinalPhasePresetOption;
  finalPhaseQualifiedTeams: number;
  finalPhaseByes: number;
  finalPhaseFormat: LeagueFinalPhaseFormatOption;
  finalPhaseTwoLegs: boolean;
  finalPhaseThirdPlaceMatch: boolean;
  finalPhaseSeededHomeAdvantage: boolean;
  finalPhasePlayInSlots: number;
  finalPhaseRoundBestOf: number;
  finalPhaseFinalBestOf: number;
  finalPhaseReseedEachRound: boolean;
  finalPhaseGrandFinalReset: boolean;
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
  competitionType: CompetitionType;
  startDate: string;
  endDate: string;
  logoBase64: string | null;
  trackedStats: string[];
  finalPhaseEnabled: boolean;
  finalPhasePreset: LeagueFinalPhasePresetOption;
  finalPhaseQualifiedTeams: number;
  finalPhaseByes: number;
  finalPhaseFormat: LeagueFinalPhaseFormatOption;
  finalPhaseTwoLegs: boolean;
  finalPhaseThirdPlaceMatch: boolean;
  finalPhaseSeededHomeAdvantage: boolean;
  finalPhasePlayInSlots: number;
  finalPhaseRoundBestOf: number;
  finalPhaseFinalBestOf: number;
  finalPhaseReseedEachRound: boolean;
  finalPhaseGrandFinalReset: boolean;
  teamIds: number[];
};

export type LeagueMutationPayload = {
  name: string;
  responsible_name: string;
  responsible_email: string;
  category: string;
  status: LeagueStatus;
  competition_type: CompetitionType;
  start_date: string;
  end_date: string;
  logo_base64: string | null;
  tracked_stats: string[];
  final_phase_enabled: boolean;
  final_phase_preset: LeagueFinalPhasePresetOption;
  final_phase_qualified_teams: number;
  final_phase_byes: number;
  final_phase_format: LeagueFinalPhaseFormatOption;
  final_phase_two_legs: boolean;
  final_phase_third_place_match: boolean;
  final_phase_seeded_home_advantage: boolean;
  final_phase_play_in_slots: number;
  final_phase_round_best_of: number;
  final_phase_final_best_of: number;
  final_phase_reseed_each_round: boolean;
  final_phase_grand_final_reset: boolean;
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
