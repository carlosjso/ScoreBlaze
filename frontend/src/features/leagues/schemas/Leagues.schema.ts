import { z } from "zod";

import { buildPaginatedResponseSchema } from "@/shared/api/pagination";
import {
  leagueFinalPhaseBestOfOptions,
  leagueFinalPhasePresetOptions,
  leagueFinalPhaseQualifiedTeamsOptions,
  leagueTrackedStatOptions,
  normalizeLeagueTrackedStats,
  sanitizeLeagueTeamIds,
  type ApiLeague,
  type ApiLeagueGroupStageConfig,
  type ApiLeagueTableRow,
  type ApiLeagueTeamSummary,
  type LeagueDetail,
  type LeagueFinalPhaseFormatOption,
  type LeagueFinalPhasePresetOption,
  type LeagueFormValues,
  type LeagueGroupStageConfig,
  type LeagueGroupStanding,
  type LeagueLeaderSummary,
  type LeagueListItem,
  type LeaguePlayerRankingRow,
  type LeagueStandingRow,
  type LeagueStatsOverview,
  type LeagueStatsSnapshot,
  type LeagueTeamLeaders,
  type LeagueMutationPayload,
  type LeagueTeamSummary,
} from "@/features/leagues/Leagues.types";

const idSchema = z.coerce.number().int();
const leagueStatusSchema = z.union([z.literal("En curso"), z.literal("Sin empezar"), z.literal("Finalizada")]);
const competitionTypeSchema = z.union([z.literal("LEAGUE"), z.literal("ELIMINATION"), z.literal("GROUPS")]);
const regularSeasonFormatSchema = z.union([z.literal("SINGLE_ROUND"), z.literal("DOUBLE_ROUND")]);
const standingsTiebreakerSchema = z.union([z.literal("HEAD_TO_HEAD"), z.literal("POINT_DIFFERENCE"), z.literal("POINTS_FOR")]);
const groupStageModeSchema = z.union([z.literal("UNIFORM"), z.literal("MANUAL")]);
const groupWildcardMetricSchema = z.union([
  z.literal("WIN_PERCENTAGE"),
  z.literal("AVERAGE_POINT_DIFFERENCE"),
  z.literal("AVERAGE_POINTS_FOR"),
]);
const apiGroupStageConfigSchema = z.object({
  mode: groupStageModeSchema,
  groups: z.array(z.object({
    key: z.string().trim().min(1),
    name: z.string().trim().min(1),
    team_ids: z.array(idSchema),
  })),
  qualifiers_per_group: z.coerce.number().int().min(0),
  best_extra_slots: z.coerce.number().int().min(0),
  wildcard_ranking: groupWildcardMetricSchema,
  wildcard_tiebreakers: z.array(groupWildcardMetricSchema),
});
const groupStageConfigSchema = z.object({
  mode: groupStageModeSchema,
  groups: z.array(z.object({
    key: z.string().trim().min(1).max(20),
    name: z.string().trim().min(1).max(50),
    teamIds: z.array(z.number().int()),
  })),
  qualifiersPerGroup: z.coerce.number().int().min(0).max(32),
  bestExtraSlots: z.coerce.number().int().min(0).max(32),
  wildcardRanking: groupWildcardMetricSchema,
  wildcardTiebreakers: z.array(groupWildcardMetricSchema),
});
const leagueFinalPhasePresetSchema = z.enum(leagueFinalPhasePresetOptions);
const leagueFinalPhaseFormatSchema = z.union([
  z.literal("SINGLE_ELIMINATION"),
  z.literal("DOUBLE_ELIMINATION"),
  z.literal("PLAY_IN_PLUS_BRACKET"),
]);
const leagueFinalPhaseSeedModeSchema = z.union([z.literal("STANDINGS"), z.literal("RANDOM"), z.literal("MANUAL")]);
type LeagueFormFieldName = Extract<keyof LeagueFormValues, string>;

export const LEAGUE_FORM_LIMITS = {
  name: 80,
  responsibleName: 100,
  responsibleEmail: 120,
  category: 80,
  trackedStats: 12,
} as const;

type LeagueFinalPhaseDefaults = Pick<
  LeagueFormValues,
  | "finalPhaseFormat"
  | "finalPhaseQualifiedTeams"
  | "finalPhaseByes"
  | "finalPhaseTwoLegs"
  | "finalPhaseThirdPlaceMatch"
  | "finalPhaseSeededHomeAdvantage"
  | "finalPhasePlayInSlots"
  | "finalPhaseRoundBestOf"
  | "finalPhaseFinalBestOf"
  | "finalPhaseReseedEachRound"
  | "finalPhaseGrandFinalReset"
>;

export const leagueFinalPhasePresetDefaults: Record<LeagueFinalPhasePresetOption, LeagueFinalPhaseDefaults> = {
  TOP_4_SINGLE_GAME: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 4,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  TOP_8_SINGLE_GAME: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 8,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  TOP_8_HOME_AWAY: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 8,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  TOP_6_SINGLE_GAME_WITH_BYES: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 6,
    finalPhaseByes: 2,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  TOP_16_SINGLE_GAME: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 16,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  TOP_32_SINGLE_GAME: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 32,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  NBA_PLAY_IN_TOP_10: {
    finalPhaseFormat: "PLAY_IN_PLUS_BRACKET",
    finalPhaseQualifiedTeams: 10,
    finalPhaseByes: 6,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 4,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 7,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
  DOUBLE_ELIMINATION_TOP_8: {
    finalPhaseFormat: "DOUBLE_ELIMINATION",
    finalPhaseQualifiedTeams: 8,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: false,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 3,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: true,
  },
  DOUBLE_ELIMINATION_TOP_16: {
    finalPhaseFormat: "DOUBLE_ELIMINATION",
    finalPhaseQualifiedTeams: 16,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: false,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 3,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: true,
  },
  CUSTOM: {
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: 8,
    finalPhaseByes: 0,
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  },
};

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function toLeagueGroupStageConfig(config: ApiLeagueGroupStageConfig | null): LeagueGroupStageConfig | null {
  if (!config) return null;

  return {
    mode: config.mode,
    groups: config.groups.map((group) => ({
      key: group.key,
      name: group.name,
      teamIds: sanitizeLeagueTeamIds(group.team_ids),
    })),
    qualifiersPerGroup: config.qualifiers_per_group,
    bestExtraSlots: config.best_extra_slots,
    wildcardRanking: config.wildcard_ranking,
    wildcardTiebreakers: config.wildcard_tiebreakers,
  };
}

function toLeagueListItem(league: ApiLeague | ApiLeagueTableRow): LeagueListItem {
  const teamIds = sanitizeLeagueTeamIds(league.team_ids);
  const teamCount = "team_count" in league ? league.team_count : teamIds.length;
  const registeredTeamCount = teamIds.length > 0 ? teamIds.length : teamCount;
  const isDirectElimination = league.competition_type === "ELIMINATION";
  const format = (isDirectElimination
    ? "SINGLE_ELIMINATION"
    : league.final_phase_format ?? "SINGLE_ELIMINATION") as LeagueFinalPhaseFormatOption;
  const directParticipantCount = isDirectElimination && registeredTeamCount >= 2
    ? registeredTeamCount
    : Number(league.final_phase_qualified_teams ?? 0);
  const directByes = isDirectElimination
    ? 0
    : Number(league.final_phase_byes ?? 0);

  return {
    id: league.id,
    name: league.name,
    responsibleName: league.responsible_name,
    responsibleEmail: league.responsible_email,
    category: league.category,
    status: league.status,
    competitionType: league.competition_type,
    regularSeasonFormat: league.regular_season_format,
    standingsTiebreakers: league.standings_tiebreakers,
    groupStageConfig: toLeagueGroupStageConfig(league.group_stage_config),
    startDate: league.start_date,
    endDate: league.end_date,
    logoBase64: "logo_base64" in league ? league.logo_base64 : null,
    trackedStats: normalizeLeagueTrackedStats(league.tracked_stats),
    finalPhaseEnabled: isDirectElimination || Boolean(league.final_phase_enabled),
    finalPhasePreset: isDirectElimination ? "CUSTOM" : league.final_phase_preset,
    finalPhaseQualifiedTeams: directParticipantCount,
    finalPhaseByes: directByes,
    finalPhaseFormat: format,
    finalPhaseTwoLegs: Boolean(league.final_phase_two_legs),
    finalPhaseThirdPlaceMatch: Boolean(league.final_phase_third_place_match),
    finalPhaseSeededHomeAdvantage: isDirectElimination ? false : Boolean(league.final_phase_seeded_home_advantage),
    finalPhaseSeedMode: league.final_phase_seed_mode ?? "STANDINGS",
    finalPhasePlayInSlots: isDirectElimination ? 0 : Number(league.final_phase_play_in_slots ?? 0),
    finalPhaseRoundBestOf: Number(league.final_phase_round_best_of ?? 1),
    finalPhaseFinalBestOf: Number(league.final_phase_final_best_of ?? 1),
    finalPhaseReseedEachRound: isDirectElimination ? false : Boolean(league.final_phase_reseed_each_round),
    finalPhaseGrandFinalReset: isDirectElimination ? false : Boolean(league.final_phase_grand_final_reset),
    teamIds,
    teamCount,
    bracketGenerated: Boolean(league.bracket_generated),
    bracketCompleted: Boolean(league.bracket_completed),
  };
}

function toLeagueTeamSummary(team: ApiLeagueTeamSummary): LeagueTeamSummary {
  return {
    id: team.id,
    name: team.name,
    logoBase64: team.logo_base64,
    responsibleName: team.responsible_name,
    responsibleEmail: team.responsible_email,
    playerCount: team.player_count,
    playersLabel: team.players_label,
  };
}

export const apiLeagueSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    responsible_name: z.string().trim().min(1),
    responsible_email: z.string().trim().email(),
    category: z.string().trim().min(1),
    status: leagueStatusSchema,
    competition_type: competitionTypeSchema,
    regular_season_format: regularSeasonFormatSchema,
    standings_tiebreakers: z.array(standingsTiebreakerSchema).length(3),
    group_stage_config: apiGroupStageConfigSchema.nullable(),
    start_date: z.string().trim().min(1),
    end_date: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    tracked_stats: z.array(z.string()),
    final_phase_enabled: z.coerce.boolean(),
    final_phase_preset: leagueFinalPhasePresetSchema,
    final_phase_qualified_teams: z.coerce.number().int().min(2).max(32),
    final_phase_byes: z.coerce.number().int().min(0),
    final_phase_format: leagueFinalPhaseFormatSchema,
    final_phase_two_legs: z.coerce.boolean(),
    final_phase_third_place_match: z.coerce.boolean(),
    final_phase_seeded_home_advantage: z.coerce.boolean(),
    final_phase_seed_mode: leagueFinalPhaseSeedModeSchema,
    final_phase_play_in_slots: z.coerce.number().int().min(0),
    final_phase_round_best_of: z.coerce.number().int().min(1).max(7),
    final_phase_final_best_of: z.coerce.number().int().min(1).max(7),
    final_phase_reseed_each_round: z.coerce.boolean(),
    final_phase_grand_final_reset: z.coerce.boolean(),
    team_ids: z.array(idSchema),
    bracket_generated: z.coerce.boolean(),
    bracket_completed: z.coerce.boolean(),
  })
  .transform((league): LeagueListItem => toLeagueListItem(league)) satisfies z.ZodType<LeagueListItem>;

export const apiLeaguesSchema = z.array(apiLeagueSchema);

export const apiLeagueTeamSummarySchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    responsible_name: z.string(),
    responsible_email: z.string(),
    player_count: z.coerce.number().int().min(0),
    players_label: z.string(),
  })
  .transform((team): LeagueTeamSummary => toLeagueTeamSummary(team)) satisfies z.ZodType<LeagueTeamSummary>;

export const apiLeagueDetailSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    responsible_name: z.string().trim().min(1),
    responsible_email: z.string().trim().email(),
    category: z.string().trim().min(1),
    status: leagueStatusSchema,
    competition_type: competitionTypeSchema,
    regular_season_format: regularSeasonFormatSchema,
    standings_tiebreakers: z.array(standingsTiebreakerSchema).length(3),
    group_stage_config: apiGroupStageConfigSchema.nullable(),
    start_date: z.string().trim().min(1),
    end_date: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    tracked_stats: z.array(z.string()),
    final_phase_enabled: z.coerce.boolean(),
    final_phase_preset: leagueFinalPhasePresetSchema,
    final_phase_qualified_teams: z.coerce.number().int().min(2).max(32),
    final_phase_byes: z.coerce.number().int().min(0),
    final_phase_format: leagueFinalPhaseFormatSchema,
    final_phase_two_legs: z.coerce.boolean(),
    final_phase_third_place_match: z.coerce.boolean(),
    final_phase_seeded_home_advantage: z.coerce.boolean(),
    final_phase_seed_mode: leagueFinalPhaseSeedModeSchema,
    final_phase_play_in_slots: z.coerce.number().int().min(0),
    final_phase_round_best_of: z.coerce.number().int().min(1).max(7),
    final_phase_final_best_of: z.coerce.number().int().min(1).max(7),
    final_phase_reseed_each_round: z.coerce.boolean(),
    final_phase_grand_final_reset: z.coerce.boolean(),
    team_ids: z.array(idSchema),
    bracket_generated: z.coerce.boolean(),
    bracket_completed: z.coerce.boolean(),
    teams: z.array(apiLeagueTeamSummarySchema),
    matches_count: z.coerce.number().int().min(0),
  })
  .transform(
    (league): LeagueDetail => ({
      ...toLeagueListItem(league),
      teams: league.teams,
      matchesCount: league.matches_count,
    }),
  ) satisfies z.ZodType<LeagueDetail>;

export const apiLeagueTableRowSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    responsible_name: z.string().trim().min(1),
    responsible_email: z.string().trim().email(),
    category: z.string().trim().min(1),
    status: leagueStatusSchema,
    competition_type: competitionTypeSchema,
    regular_season_format: regularSeasonFormatSchema,
    standings_tiebreakers: z.array(standingsTiebreakerSchema).length(3),
    group_stage_config: apiGroupStageConfigSchema.nullable(),
    start_date: z.string().trim().min(1),
    end_date: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    tracked_stats: z.array(z.string()),
    final_phase_enabled: z.coerce.boolean(),
    final_phase_preset: leagueFinalPhasePresetSchema,
    final_phase_qualified_teams: z.coerce.number().int().min(2).max(32),
    final_phase_byes: z.coerce.number().int().min(0),
    final_phase_format: leagueFinalPhaseFormatSchema,
    final_phase_two_legs: z.coerce.boolean(),
    final_phase_third_place_match: z.coerce.boolean(),
    final_phase_seeded_home_advantage: z.coerce.boolean(),
    final_phase_seed_mode: leagueFinalPhaseSeedModeSchema,
    final_phase_play_in_slots: z.coerce.number().int().min(0),
    final_phase_round_best_of: z.coerce.number().int().min(1).max(7),
    final_phase_final_best_of: z.coerce.number().int().min(1).max(7),
    final_phase_reseed_each_round: z.coerce.boolean(),
    final_phase_grand_final_reset: z.coerce.boolean(),
    team_ids: z.array(idSchema),
    bracket_generated: z.coerce.boolean(),
    bracket_completed: z.coerce.boolean(),
    team_count: z.coerce.number().int().min(0),
  })
  .transform((league): LeagueListItem => toLeagueListItem(league)) satisfies z.ZodType<LeagueListItem>;

export const apiPaginatedLeaguesTableSchema = buildPaginatedResponseSchema(apiLeagueTableRowSchema);

const apiLeagueLeaderSummarySchema = z
  .object({
    team_id: z.coerce.number().int().nullable().optional(),
    team_name: z.string().nullable().optional(),
    value: z.coerce.number().int().default(0),
  })
  .transform(
    (leader): LeagueLeaderSummary => ({
      teamId: leader.team_id ?? null,
      teamName: leader.team_name ?? null,
      value: leader.value,
    }),
  ) satisfies z.ZodType<LeagueLeaderSummary>;

const apiLeagueStatsOverviewSchema = z
  .object({
    teams_count: z.coerce.number().int().min(0),
    total_matches: z.coerce.number().int().min(0),
    scheduled_matches: z.coerce.number().int().min(0),
    live_matches: z.coerce.number().int().min(0),
    finished_matches: z.coerce.number().int().min(0),
    champion: apiLeagueLeaderSummarySchema.nullable().optional(),
  })
  .transform(
    (overview): LeagueStatsOverview => ({
      teamsCount: overview.teams_count,
      totalMatches: overview.total_matches,
      scheduledMatches: overview.scheduled_matches,
      liveMatches: overview.live_matches,
      finishedMatches: overview.finished_matches,
      champion: overview.champion ?? null,
    }),
  ) satisfies z.ZodType<LeagueStatsOverview>;

const apiLeagueTeamLeadersSchema = z
  .object({
    top_offense: apiLeagueLeaderSummarySchema.nullable().optional(),
    best_defense: apiLeagueLeaderSummarySchema.nullable().optional(),
    most_wins: apiLeagueLeaderSummarySchema.nullable().optional(),
  })
  .transform(
    (leaders): LeagueTeamLeaders => ({
      topOffense: leaders.top_offense ?? null,
      bestDefense: leaders.best_defense ?? null,
      mostWins: leaders.most_wins ?? null,
    }),
  ) satisfies z.ZodType<LeagueTeamLeaders>;

const apiLeagueStandingRowSchema = z
  .object({
    position: z.coerce.number().int().min(1),
    team_id: idSchema,
    team_name: z.string().trim().min(1),
    matches_played: z.coerce.number().int().min(0),
    wins: z.coerce.number().int().min(0),
    losses: z.coerce.number().int().min(0),
    draws: z.coerce.number().int().min(0),
    points_for: z.coerce.number().int(),
    points_against: z.coerce.number().int(),
    points_difference: z.coerce.number().int(),
    standings_points: z.coerce.number().int(),
    total_team_fouls: z.coerce.number().int().min(0),
  })
  .transform(
    (row): LeagueStandingRow => ({
      position: row.position,
      teamId: row.team_id,
      teamName: row.team_name,
      matchesPlayed: row.matches_played,
      wins: row.wins,
      losses: row.losses,
      draws: row.draws,
      pointsFor: row.points_for,
      pointsAgainst: row.points_against,
      pointsDifference: row.points_difference,
      standingsPoints: row.standings_points,
      totalTeamFouls: row.total_team_fouls,
    }),
  ) satisfies z.ZodType<LeagueStandingRow>;

const apiLeagueGroupStandingSchema = z
  .object({
    group_key: z.string().trim().min(1),
    group_name: z.string().trim().min(1),
    team_ids: z.array(idSchema),
    match_count: z.coerce.number().int().min(0),
    standings: z.array(apiLeagueStandingRowSchema),
  })
  .transform(
    (group): LeagueGroupStanding => ({
      groupKey: group.group_key,
      groupName: group.group_name,
      teamIds: sanitizeLeagueTeamIds(group.team_ids),
      matchCount: group.match_count,
      standings: group.standings,
    }),
  ) satisfies z.ZodType<LeagueGroupStanding>;

const apiLeaguePlayerRankingRowSchema = z
  .object({
    position: z.coerce.number().int().min(1),
    player_id: idSchema,
    player_name: z.string().trim().min(1),
    team_id: z.coerce.number().int().nullable().optional(),
    team_name: z.string().trim().nullable().optional(),
    matches_played: z.coerce.number().int().min(0),
    total_points: z.coerce.number().int().min(0),
    made_1pt: z.coerce.number().int().min(0),
    made_2pt: z.coerce.number().int().min(0),
    made_3pt: z.coerce.number().int().min(0),
    missed_shots: z.coerce.number().int().min(0),
    total_assists: z.coerce.number().int().min(0),
    total_rebounds: z.coerce.number().int().min(0),
    total_fouls: z.coerce.number().int().min(0),
  })
  .transform(
    (row): LeaguePlayerRankingRow => ({
      position: row.position,
      playerId: row.player_id,
      playerName: row.player_name,
      teamId: row.team_id ?? null,
      teamName: row.team_name ?? null,
      matchesPlayed: row.matches_played,
      totalPoints: row.total_points,
      made1pt: row.made_1pt,
      made2pt: row.made_2pt,
      made3pt: row.made_3pt,
      missedShots: row.missed_shots,
      totalAssists: row.total_assists,
      totalRebounds: row.total_rebounds,
      totalFouls: row.total_fouls,
    }),
  ) satisfies z.ZodType<LeaguePlayerRankingRow>;

export const apiLeagueStatsSnapshotSchema = z
  .object({
    league_id: idSchema,
    league_name: z.string().trim().min(1),
    league_status: leagueStatusSchema,
    tracked_stats: z.array(z.string()),
    overview: apiLeagueStatsOverviewSchema,
    team_leaders: apiLeagueTeamLeadersSchema,
    standings: z.array(apiLeagueStandingRowSchema),
    group_standings: z.array(apiLeagueGroupStandingSchema).default([]),
    player_rankings: z.array(apiLeaguePlayerRankingRowSchema).default([]),
    updated_at: z.string().trim().min(1),
  })
  .transform(
    (snapshot): LeagueStatsSnapshot => ({
      leagueId: snapshot.league_id,
      leagueName: snapshot.league_name,
      leagueStatus: snapshot.league_status,
      trackedStats: normalizeLeagueTrackedStats(snapshot.tracked_stats),
      overview: snapshot.overview,
      teamLeaders: snapshot.team_leaders,
      standings: snapshot.standings,
      groupStandings: snapshot.group_standings,
      playerRankings: snapshot.player_rankings,
      updatedAt: snapshot.updated_at,
    }),
  ) satisfies z.ZodType<LeagueStatsSnapshot>;

export const leagueFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre de la liga es obligatorio.")
      .max(LEAGUE_FORM_LIMITS.name, "El nombre de la liga no puede exceder 80 caracteres."),
    responsibleName: z
      .string()
      .trim()
      .min(1, "El nombre del responsable es obligatorio.")
      .max(LEAGUE_FORM_LIMITS.responsibleName, "El nombre del responsable no puede exceder 100 caracteres."),
    responsibleEmail: z
      .string()
      .trim()
      .min(1, "El correo del responsable es obligatorio.")
      .max(LEAGUE_FORM_LIMITS.responsibleEmail, "El correo del responsable no puede exceder 120 caracteres.")
      .email("Ingresa un correo valido."),
    category: z
      .string()
      .trim()
      .min(1, "La categoria es obligatoria.")
      .max(LEAGUE_FORM_LIMITS.category, "La categoria no puede exceder 80 caracteres."),
    status: leagueStatusSchema,
    competitionType: competitionTypeSchema,
    regularSeasonFormat: regularSeasonFormatSchema,
    standingsTiebreakers: z.array(standingsTiebreakerSchema).length(3),
    groupStageConfig: groupStageConfigSchema.nullable(),
    startDate: z
      .string()
      .trim()
      .min(1, "La fecha de inicio es obligatoria.")
      .refine((value) => isValidDateString(value), "Selecciona una fecha de inicio valida."),
    endDate: z
      .string()
      .trim()
      .min(1, "La fecha de fin es obligatoria.")
      .refine((value) => isValidDateString(value), "Selecciona una fecha de fin valida."),
    logoBase64: z.string().nullable(),
    trackedStats: z.array(z.string()).max(LEAGUE_FORM_LIMITS.trackedStats, "No puedes registrar mas de 12 metricas."),
    finalPhaseEnabled: z.coerce.boolean(),
    finalPhasePreset: leagueFinalPhasePresetSchema,
    finalPhaseQualifiedTeams: z.coerce.number().int().min(2).max(32),
    finalPhaseByes: z.coerce.number().int().min(0),
    finalPhaseFormat: leagueFinalPhaseFormatSchema,
    finalPhaseTwoLegs: z.coerce.boolean(),
    finalPhaseThirdPlaceMatch: z.coerce.boolean(),
    finalPhaseSeededHomeAdvantage: z.coerce.boolean(),
    finalPhaseSeedMode: leagueFinalPhaseSeedModeSchema,
    finalPhasePlayInSlots: z.coerce.number().int().min(0),
    finalPhaseRoundBestOf: z.coerce.number().int().min(1).max(7),
    finalPhaseFinalBestOf: z.coerce.number().int().min(1).max(7),
    finalPhaseReseedEachRound: z.coerce.boolean(),
    finalPhaseGrandFinalReset: z.coerce.boolean(),
    teamIds: z.array(z.number().int()),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: "La fecha de inicio no puede ser posterior a la fecha final.",
    path: ["endDate"],
  })
  .superRefine((values, context) => {
    if (values.competitionType === "ELIMINATION" && sanitizeLeagueTeamIds(values.teamIds).length === 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Una eliminatoria requiere al menos 2 equipos inscritos.",
        path: ["teamIds"],
      });
    }

    const directEliminationTeamCount = sanitizeLeagueTeamIds(values.teamIds).length;
    if (
      values.competitionType === "ELIMINATION"
      && directEliminationTeamCount > 0
      && (directEliminationTeamCount > 32 || (directEliminationTeamCount & (directEliminationTeamCount - 1)) !== 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La eliminacion directa requiere 2, 4, 8, 16 o 32 equipos.",
        path: ["teamIds"],
      });
    }

    if (values.competitionType === "ELIMINATION" && values.finalPhaseFormat !== "SINGLE_ELIMINATION") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La eliminacion directa solo admite una llave simple.",
        path: ["finalPhaseFormat"],
      });
    }

    if (values.competitionType === "GROUPS") {
      const config = values.groupStageConfig;
      const registeredTeamIds = sanitizeLeagueTeamIds(values.teamIds);
      if (!config) {
        // Participants can be gathered before their group distribution is defined.
        if (values.finalPhaseEnabled) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Configura los grupos antes de habilitar una fase final.",
            path: ["groupStageConfig"],
          });
        }
      } else if (config.groups.length < 2 || config.groups.length > 16) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Configura entre 2 y 16 grupos.",
          path: ["groupStageConfig"],
        });
      } else {
        const assignedTeamIds = config.groups.flatMap((group) => group.teamIds);
        const uniqueAssignedTeamIds = sanitizeLeagueTeamIds(assignedTeamIds);
        if (config.groups.some((group) => group.teamIds.length < 2 || group.teamIds.length > 5)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cada grupo debe tener entre 2 y 5 equipos.",
            path: ["groupStageConfig"],
          });
        }
        if (
          assignedTeamIds.length !== uniqueAssignedTeamIds.length
          || uniqueAssignedTeamIds.length !== registeredTeamIds.length
          || uniqueAssignedTeamIds.some((teamId) => !registeredTeamIds.includes(teamId))
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cada equipo inscrito debe pertenecer a un solo grupo.",
            path: ["groupStageConfig"],
          });
        }
        if (config.mode === "UNIFORM" && new Set(config.groups.map((group) => group.teamIds.length)).size > 1) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "En grupos uniformes todos deben tener la misma cantidad de equipos.",
            path: ["groupStageConfig"],
          });
        }
        if (values.finalPhaseEnabled) {
          const expectedQualifiedTeams = config.groups.length * config.qualifiersPerGroup + config.bestExtraSlots;
          const smallestGroup = Math.min(...config.groups.map((group) => group.teamIds.length));
          if (config.qualifiersPerGroup < 1 || config.qualifiersPerGroup > smallestGroup) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "El numero de clasificados por grupo no es valido.",
              path: ["groupStageConfig"],
            });
          }
          if (expectedQualifiedTeams !== values.finalPhaseQualifiedTeams) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Los clasificados por grupo y mejores extras deben coincidir con el total de la fase final.",
              path: ["groupStageConfig"],
            });
          }
        } else if (config.qualifiersPerGroup !== 0 || config.bestExtraSlots !== 0) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Activa la fase final para configurar clasificados de los grupos.",
            path: ["groupStageConfig"],
          });
        }
      }
    }

    if (!values.finalPhaseEnabled) {
      return;
    }

    if (
      values.competitionType !== "GROUPS"
      && values.competitionType !== "ELIMINATION"
      && !leagueFinalPhaseQualifiedTeamsOptions.includes(values.finalPhaseQualifiedTeams as (typeof leagueFinalPhaseQualifiedTeamsOptions)[number])
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecciona un numero valido de equipos clasificados para la fase final.",
        path: ["finalPhaseQualifiedTeams"],
      });
    }

    const registeredTeamsCount = sanitizeLeagueTeamIds(values.teamIds).length;
    if (
      values.competitionType === "ELIMINATION"
      && registeredTeamsCount >= 2
      && values.finalPhaseQualifiedTeams !== registeredTeamsCount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En eliminacion directa todos los equipos inscritos participan en la llave.",
        path: ["finalPhaseQualifiedTeams"],
      });
    }

    if (
      values.competitionType !== "ELIMINATION"
      && registeredTeamsCount > 0
      && values.finalPhaseQualifiedTeams > registeredTeamsCount
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La fase final no puede clasificar mas equipos de los inscritos en la liga.",
        path: ["finalPhaseQualifiedTeams"],
      });
    }

    if (values.finalPhaseByes >= values.finalPhaseQualifiedTeams) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los byes deben ser menores al total de clasificados.",
        path: ["finalPhaseByes"],
      });
    }

    if (
      values.finalPhaseFormat === "SINGLE_ELIMINATION"
      && (values.finalPhaseQualifiedTeams - values.finalPhaseByes) % 2 !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La eliminacion simple requiere que los equipos en primera ronda (clasificados menos byes) sean pares.",
        path: ["finalPhaseByes"],
      });
    }

    if (values.finalPhaseFormat === "SINGLE_ELIMINATION") {
      const bracketSize = 2 ** Math.ceil(Math.log2(values.finalPhaseQualifiedTeams));
      const expectedByes = bracketSize - values.finalPhaseQualifiedTeams;
      if (values.finalPhaseByes !== expectedByes) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Una llave de ${values.finalPhaseQualifiedTeams} equipos requiere exactamente ${expectedByes} byes.`,
          path: ["finalPhaseByes"],
        });
      }
    }

    if (values.finalPhasePlayInSlots >= values.finalPhaseQualifiedTeams) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los cupos de play-in deben ser menores al total de clasificados.",
        path: ["finalPhasePlayInSlots"],
      });
    }

    if (values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET" && values.finalPhasePlayInSlots < 2) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El formato play-in requiere al menos 2 equipos en la fase de play-in.",
        path: ["finalPhasePlayInSlots"],
      });
    }

    if (values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET" && values.finalPhasePlayInSlots % 2 !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El formato play-in requiere una cantidad par de cupos de play-in.",
        path: ["finalPhasePlayInSlots"],
      });
    }

    if (
      values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
      && values.finalPhaseByes !== values.finalPhaseQualifiedTeams - values.finalPhasePlayInSlots
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "En formato play-in, los byes deben coincidir con los equipos que avanzan directo al bracket.",
        path: ["finalPhaseByes"],
      });
    }

    if (values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET") {
      const mainBracketTeams = values.finalPhaseByes + values.finalPhasePlayInSlots / 2;
      if (!Number.isInteger(mainBracketTeams) || (mainBracketTeams & (mainBracketTeams - 1)) !== 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "El play-in debe dejar 2, 4, 8 o 16 equipos en la llave principal.",
          path: ["finalPhasePlayInSlots"],
        });
      }
    }

    if (values.finalPhaseFormat !== "PLAY_IN_PLUS_BRACKET" && values.finalPhasePlayInSlots !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Solo el formato play-in puede registrar cupos de play-in.",
        path: ["finalPhasePlayInSlots"],
      });
    }

    if (values.finalPhaseTwoLegs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ida y vuelta pertenece a la fase regular y no es una serie eliminatoria.",
        path: ["finalPhaseTwoLegs"],
      });
    }

    if (values.finalPhaseFormat === "DOUBLE_ELIMINATION" && values.finalPhaseByes !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La doble eliminacion no permite byes en esta version.",
        path: ["finalPhaseByes"],
      });
    }

    if (values.finalPhaseFormat === "DOUBLE_ELIMINATION" && values.finalPhaseThirdPlaceMatch) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La doble eliminacion no usa partido por el tercer lugar.",
        path: ["finalPhaseThirdPlaceMatch"],
      });
    }

    if (values.finalPhaseFormat === "DOUBLE_ELIMINATION" && values.finalPhaseReseedEachRound) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La doble eliminacion conserva cruces fijos entre sus dos carriles.",
        path: ["finalPhaseReseedEachRound"],
      });
    }

    if (
      values.finalPhaseFormat === "DOUBLE_ELIMINATION"
      && (values.finalPhaseQualifiedTeams & (values.finalPhaseQualifiedTeams - 1)) !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La doble eliminacion requiere una cantidad potencia de 2 en equipos clasificados.",
        path: ["finalPhaseQualifiedTeams"],
      });
    }

    if (values.finalPhaseFormat !== "DOUBLE_ELIMINATION" && values.finalPhaseGrandFinalReset) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El reinicio de gran final solo aplica en doble eliminacion.",
        path: ["finalPhaseGrandFinalReset"],
      });
    }

    if (values.finalPhasePreset !== "CUSTOM") {
      return;
    }

    if (!leagueFinalPhaseBestOfOptions.includes(values.finalPhaseRoundBestOf as (typeof leagueFinalPhaseBestOfOptions)[number])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El formato personalizado requiere mejor de 1, 3, 5 o 7 partidos por ronda.",
        path: ["finalPhaseRoundBestOf"],
      });
    }

    if (!leagueFinalPhaseBestOfOptions.includes(values.finalPhaseFinalBestOf as (typeof leagueFinalPhaseBestOfOptions)[number])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "La final personalizada requiere mejor de 1, 3, 5 o 7 partidos.",
        path: ["finalPhaseFinalBestOf"],
      });
    }
  }) satisfies z.ZodType<LeagueFormValues>;

export const leagueFormApiFieldMap = {
  name: "name",
  responsible_name: "responsibleName",
  responsible_email: "responsibleEmail",
  category: "category",
  status: "status",
  competition_type: "competitionType",
  regular_season_format: "regularSeasonFormat",
  standings_tiebreakers: "standingsTiebreakers",
  group_stage_config: "groupStageConfig",
  start_date: "startDate",
  end_date: "endDate",
  logo_base64: "logoBase64",
  tracked_stats: "trackedStats",
  final_phase_enabled: "finalPhaseEnabled",
  final_phase_preset: "finalPhasePreset",
  final_phase_qualified_teams: "finalPhaseQualifiedTeams",
  final_phase_byes: "finalPhaseByes",
  final_phase_format: "finalPhaseFormat",
  final_phase_two_legs: "finalPhaseTwoLegs",
  final_phase_third_place_match: "finalPhaseThirdPlaceMatch",
  final_phase_seeded_home_advantage: "finalPhaseSeededHomeAdvantage",
  final_phase_seed_mode: "finalPhaseSeedMode",
  final_phase_play_in_slots: "finalPhasePlayInSlots",
  final_phase_round_best_of: "finalPhaseRoundBestOf",
  final_phase_final_best_of: "finalPhaseFinalBestOf",
  final_phase_reseed_each_round: "finalPhaseReseedEachRound",
  final_phase_grand_final_reset: "finalPhaseGrandFinalReset",
  team_ids: "teamIds",
} satisfies Record<string, LeagueFormFieldName>;

export const leagueFormApiMessageFieldMap = {
  "Ya existe una liga con ese nombre.": "name",
  "La fecha de inicio de la liga no puede ser posterior a la fecha final.": ["startDate", "endDate"],
  "La fase final no puede clasificar mas equipos de los inscritos en la liga.": "finalPhaseQualifiedTeams",
  "La fase final personalizada requiere al menos 2 equipos clasificados.": "finalPhaseQualifiedTeams",
  "La fase final personalizada no puede clasificar mas de 32 equipos.": "finalPhaseQualifiedTeams",
  "Los byes de fase final no pueden ser negativos.": "finalPhaseByes",
  "Los byes de fase final deben ser menores al total de equipos clasificados.": "finalPhaseByes",
  "La eliminacion simple requiere que los equipos en primera ronda (clasificados menos byes) sean pares.": "finalPhaseByes",
  "El formato personalizado requiere mejor de 1, 3, 5 o 7 partidos por ronda.": "finalPhaseRoundBestOf",
  "La final personalizada requiere mejor de 1, 3, 5 o 7 partidos.": "finalPhaseFinalBestOf",
  "Los cupos de play-in no pueden ser negativos.": "finalPhasePlayInSlots",
  "Los cupos de play-in deben ser menores al total de equipos clasificados.": "finalPhasePlayInSlots",
  "El formato play-in requiere al menos 2 equipos en la fase de play-in.": "finalPhasePlayInSlots",
  "El formato play-in requiere una cantidad par de cupos de play-in.": "finalPhasePlayInSlots",
  "El play-in debe dejar una cantidad potencia de 2 para la llave principal.": "finalPhasePlayInSlots",
  "En formato play-in, los byes deben coincidir con los equipos que avanzan directo al bracket.": "finalPhaseByes",
  "Solo el formato play-in puede registrar cupos de play-in.": "finalPhasePlayInSlots",
  "La doble eliminacion no permite byes en esta version.": "finalPhaseByes",
  "La doble eliminacion no usa partido por el tercer lugar.": "finalPhaseThirdPlaceMatch",
  "La doble eliminacion conserva cruces fijos entre sus dos carriles.": "finalPhaseReseedEachRound",
  "La doble eliminacion requiere una cantidad potencia de 2 en equipos clasificados.": "finalPhaseQualifiedTeams",
  "Ida y vuelta pertenece a la fase regular y no es una serie eliminatoria.": "finalPhaseTwoLegs",
  "Esta liga ya tiene partidos. Confirma el cambio de una vuelta a ida y vuelta, o viceversa.": "regularSeasonFormat",
  "El reinicio de gran final solo aplica en doble eliminacion.": "finalPhaseGrandFinalReset",
  "Una eliminatoria requiere al menos 2 equipos inscritos.": "teamIds",
  "La eliminacion directa requiere 2, 4, 8, 16 o 32 equipos inscritos.": "teamIds",
  "La eliminacion directa requiere 2, 4, 8, 16 o 32 participantes.": "teamIds",
  "La eliminacion directa solo admite una llave simple. Guarda primero Configurar modo.": "finalPhaseFormat",
  "Configura los grupos antes de habilitar una fase final.": "groupStageConfig",
  "No se pudo procesar el logo de la liga.": "logoBase64",
} satisfies Record<string, LeagueFormFieldName | readonly LeagueFormFieldName[]>;

export function toLeagueFormValues(league?: LeagueListItem | LeagueDetail | null): LeagueFormValues {
  if (league) {
    return normalizeLeagueStructureValues({
      name: league.name,
      responsibleName: league.responsibleName,
      responsibleEmail: league.responsibleEmail,
      category: league.category,
      status: league.status,
      competitionType: league.competitionType,
      regularSeasonFormat: league.regularSeasonFormat,
      standingsTiebreakers: league.standingsTiebreakers,
      groupStageConfig: league.groupStageConfig,
      startDate: league.startDate,
      endDate: league.endDate,
      logoBase64: league.logoBase64,
      trackedStats: normalizeLeagueTrackedStats(league.trackedStats),
      finalPhaseEnabled: league.competitionType === "ELIMINATION" ? true : league.finalPhaseEnabled,
      finalPhasePreset: league.finalPhasePreset,
      finalPhaseQualifiedTeams: league.finalPhaseQualifiedTeams,
      finalPhaseByes: league.finalPhaseByes,
      finalPhaseFormat: league.finalPhaseFormat,
      finalPhaseTwoLegs: league.finalPhaseTwoLegs,
      finalPhaseThirdPlaceMatch: league.finalPhaseThirdPlaceMatch,
      finalPhaseSeededHomeAdvantage: league.finalPhaseSeededHomeAdvantage,
      finalPhaseSeedMode: league.finalPhaseSeedMode,
      finalPhasePlayInSlots: league.finalPhasePlayInSlots,
      finalPhaseRoundBestOf: league.finalPhaseRoundBestOf,
      finalPhaseFinalBestOf: league.finalPhaseFinalBestOf,
      finalPhaseReseedEachRound: league.finalPhaseReseedEachRound,
      finalPhaseGrandFinalReset: league.finalPhaseGrandFinalReset,
      teamIds: sanitizeLeagueTeamIds(league.teamIds),
    });
  }

  return {
    name: "",
    responsibleName: "",
    responsibleEmail: "",
    category: "",
    status: "Sin empezar",
    competitionType: "LEAGUE",
    regularSeasonFormat: "SINGLE_ROUND",
    standingsTiebreakers: ["HEAD_TO_HEAD", "POINT_DIFFERENCE", "POINTS_FOR"],
    groupStageConfig: null,
    startDate: "",
    endDate: "",
    logoBase64: null,
    trackedStats: [...leagueTrackedStatOptions],
    finalPhaseEnabled: false,
    finalPhasePreset: "TOP_8_SINGLE_GAME",
    finalPhaseQualifiedTeams: 8,
    finalPhaseByes: 0,
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseTwoLegs: false,
    finalPhaseThirdPlaceMatch: false,
    finalPhaseSeededHomeAdvantage: true,
    finalPhaseSeedMode: "STANDINGS",
    finalPhasePlayInSlots: 0,
    finalPhaseRoundBestOf: 1,
    finalPhaseFinalBestOf: 1,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
    teamIds: [],
  };
}

export function getRequiredSingleEliminationByes(teamCount: number): number {
  if (teamCount < 2) {
    return 0;
  }

  return 2 ** Math.ceil(Math.log2(teamCount)) - teamCount;
}

export function normalizeLeagueStructureValues(values: LeagueFormValues): LeagueFormValues {
  const teamIds = sanitizeLeagueTeamIds(values.teamIds);
  if (values.competitionType !== "ELIMINATION" || teamIds.length < 2) {
    return { ...values, teamIds };
  }

  const participantCount = teamIds.length;

  return {
    ...values,
    teamIds,
    finalPhaseEnabled: true,
    finalPhasePreset: "CUSTOM",
    finalPhaseFormat: "SINGLE_ELIMINATION",
    finalPhaseQualifiedTeams: participantCount,
    finalPhaseByes: 0,
    finalPhasePlayInSlots: 0,
    finalPhaseSeededHomeAdvantage: false,
    finalPhaseReseedEachRound: false,
    finalPhaseGrandFinalReset: false,
  };
}

export function toLeagueMutationPayload(
  values: LeagueFormValues,
  options?: { confirmRegularSeasonFormatChange?: boolean; confirmIncompleteFinish?: boolean },
): LeagueMutationPayload {
  const normalizedValues = leagueFormSchema.parse(normalizeLeagueStructureValues(values));
  const selectedPresetDefaults = leagueFinalPhasePresetDefaults[normalizedValues.finalPhasePreset];
  const resolvedFinalPhaseValues =
    !normalizedValues.finalPhaseEnabled
      ? {
          finalPhaseEnabled: false,
          finalPhasePreset: "TOP_8_SINGLE_GAME" as const,
          ...leagueFinalPhasePresetDefaults.TOP_8_SINGLE_GAME,
        }
      : normalizedValues.finalPhasePreset === "CUSTOM"
        ? {
            finalPhaseEnabled: true,
            finalPhasePreset: normalizedValues.finalPhasePreset,
            finalPhaseQualifiedTeams: normalizedValues.finalPhaseQualifiedTeams,
            finalPhaseByes: normalizedValues.finalPhaseByes,
            finalPhaseFormat: normalizedValues.finalPhaseFormat,
            finalPhaseTwoLegs: normalizedValues.finalPhaseTwoLegs,
            finalPhaseThirdPlaceMatch: normalizedValues.finalPhaseThirdPlaceMatch,
            finalPhaseSeededHomeAdvantage: normalizedValues.finalPhaseSeededHomeAdvantage,
            finalPhasePlayInSlots: normalizedValues.finalPhasePlayInSlots,
            finalPhaseRoundBestOf: normalizedValues.finalPhaseRoundBestOf,
            finalPhaseFinalBestOf: normalizedValues.finalPhaseFinalBestOf,
            finalPhaseReseedEachRound: normalizedValues.finalPhaseReseedEachRound,
            finalPhaseGrandFinalReset: normalizedValues.finalPhaseGrandFinalReset,
          }
        : {
            finalPhaseEnabled: true,
            finalPhasePreset: normalizedValues.finalPhasePreset,
            ...selectedPresetDefaults,
          };

  return {
    name: normalizedValues.name.trim(),
    responsible_name: normalizedValues.responsibleName.trim(),
    responsible_email: normalizedValues.responsibleEmail.trim().toLowerCase(),
    category: normalizedValues.category.trim(),
    status: normalizedValues.status,
    competition_type: normalizedValues.competitionType,
    regular_season_format: normalizedValues.regularSeasonFormat,
    standings_tiebreakers: normalizedValues.standingsTiebreakers,
    group_stage_config: normalizedValues.competitionType === "GROUPS" && normalizedValues.groupStageConfig
      ? {
          mode: normalizedValues.groupStageConfig.mode,
          groups: normalizedValues.groupStageConfig.groups.map((group) => ({
            key: group.key,
            name: group.name,
            team_ids: sanitizeLeagueTeamIds(group.teamIds),
          })),
          qualifiers_per_group: normalizedValues.finalPhaseEnabled ? normalizedValues.groupStageConfig.qualifiersPerGroup : 0,
          best_extra_slots: normalizedValues.finalPhaseEnabled ? normalizedValues.groupStageConfig.bestExtraSlots : 0,
          wildcard_ranking: normalizedValues.groupStageConfig.wildcardRanking,
          wildcard_tiebreakers: normalizedValues.groupStageConfig.wildcardTiebreakers,
        }
      : null,
    start_date: normalizedValues.startDate,
    end_date: normalizedValues.endDate,
    logo_base64: normalizedValues.logoBase64?.trim() ? normalizedValues.logoBase64.trim() : null,
    tracked_stats: normalizeLeagueTrackedStats(normalizedValues.trackedStats),
    final_phase_enabled: resolvedFinalPhaseValues.finalPhaseEnabled,
    final_phase_preset: resolvedFinalPhaseValues.finalPhasePreset,
    final_phase_qualified_teams: resolvedFinalPhaseValues.finalPhaseQualifiedTeams,
    final_phase_byes: resolvedFinalPhaseValues.finalPhaseByes,
    final_phase_format: resolvedFinalPhaseValues.finalPhaseFormat,
    final_phase_two_legs: resolvedFinalPhaseValues.finalPhaseTwoLegs,
    final_phase_third_place_match: resolvedFinalPhaseValues.finalPhaseThirdPlaceMatch,
    final_phase_seeded_home_advantage: resolvedFinalPhaseValues.finalPhaseSeededHomeAdvantage,
    final_phase_seed_mode: normalizedValues.finalPhaseSeedMode,
    final_phase_play_in_slots: resolvedFinalPhaseValues.finalPhasePlayInSlots,
    final_phase_round_best_of: resolvedFinalPhaseValues.finalPhaseRoundBestOf,
    final_phase_final_best_of: resolvedFinalPhaseValues.finalPhaseFinalBestOf,
    final_phase_reseed_each_round: resolvedFinalPhaseValues.finalPhaseReseedEachRound,
    final_phase_grand_final_reset: resolvedFinalPhaseValues.finalPhaseGrandFinalReset,
    team_ids: sanitizeLeagueTeamIds(normalizedValues.teamIds),
    ...(options?.confirmRegularSeasonFormatChange ? { confirm_regular_season_format_change: true } : {}),
    ...(options?.confirmIncompleteFinish ? { confirm_incomplete_finish: true } : {}),
  };
}
