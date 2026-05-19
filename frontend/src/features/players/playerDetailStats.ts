import type {
  ApiPlayerStat,
  PlayerHistoricalStats,
  PlayerLeagueStats,
  PlayerListItem,
} from "@/features/players/Players.types";

export function formatPlayerStatsDateLabel(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(parsed);
}

function buildSharedPlayerMetrics(params: {
  matchesPlayed: number;
  totalPoints: number;
  made1pt: number;
  made2pt: number;
  made3pt: number;
  missedShots: number;
  totalAssists: number;
  totalRebounds: number;
  totalFouls: number;
  trackedMadeShots?: number | null;
  trackedShotAttempts?: number | null;
  shootingAccuracy?: number | null;
}) {
  const totalMadeShots =
    params.trackedMadeShots === undefined ? params.made1pt + params.made2pt + params.made3pt : params.trackedMadeShots;
  const totalShotAttempts =
    params.trackedShotAttempts === undefined
      ? totalMadeShots === null
        ? null
        : totalMadeShots + params.missedShots
      : params.trackedShotAttempts;
  const shootingAccuracy =
    params.shootingAccuracy === undefined
      ? totalMadeShots !== null && totalShotAttempts !== null && totalShotAttempts > 0
        ? (totalMadeShots / totalShotAttempts) * 100
        : null
      : params.shootingAccuracy;

  return {
    ...params,
    totalMadeShots,
    totalShotAttempts,
    shootingAccuracy,
    averagePoints: params.matchesPlayed > 0 ? params.totalPoints / params.matchesPlayed : null,
    averageAssists: params.matchesPlayed > 0 ? params.totalAssists / params.matchesPlayed : null,
    averageRebounds: params.matchesPlayed > 0 ? params.totalRebounds / params.matchesPlayed : null,
  };
}

export function buildHistoricalPlayerStats(
  player: PlayerListItem,
  stat: ApiPlayerStat | null,
): PlayerHistoricalStats {
  const metrics = buildSharedPlayerMetrics({
    matchesPlayed: stat?.matches_played ?? 0,
    totalPoints: stat?.total_points ?? 0,
    made1pt: stat?.made_1pt ?? 0,
    made2pt: stat?.made_2pt ?? 0,
    made3pt: stat?.made_3pt ?? 0,
    missedShots: stat?.missed_shots ?? 0,
    totalAssists: stat?.total_assists ?? 0,
    totalRebounds: stat?.total_rebounds ?? 0,
    totalFouls: stat?.total_fouls ?? 0,
    trackedMadeShots: stat?.tracked_made_shots,
    trackedShotAttempts: stat?.tracked_shot_attempts,
    shootingAccuracy: stat?.shooting_accuracy,
  });

  return {
    scope: "historical",
    ...metrics,
    teamsCount: player.teamsCount,
    updatedAt: stat?.updated_at ?? null,
  };
}

export function buildLeaguePlayerStats(params: {
  leagueName: string;
  teamName: string;
  matchesPlayed: number;
  teamMatchesPlayed: number;
  participationRate: number | null;
  rankingPosition: number | null;
  totalPoints: number;
  made1pt: number;
  made2pt: number;
  made3pt: number;
  missedShots: number;
  totalAssists: number;
  totalRebounds: number;
  totalFouls: number;
  trackedStats?: string[];
}): PlayerLeagueStats {
  const tracksMissedShots = params.trackedStats?.includes("Fallo") ?? true;
  const metrics = buildSharedPlayerMetrics({
    matchesPlayed: params.matchesPlayed,
    totalPoints: params.totalPoints,
    made1pt: params.made1pt,
    made2pt: params.made2pt,
    made3pt: params.made3pt,
    missedShots: params.missedShots,
    totalAssists: params.totalAssists,
    totalRebounds: params.totalRebounds,
    totalFouls: params.totalFouls,
    trackedMadeShots: tracksMissedShots ? params.made1pt + params.made2pt + params.made3pt : null,
    trackedShotAttempts: tracksMissedShots ? params.made1pt + params.made2pt + params.made3pt + params.missedShots : null,
    shootingAccuracy:
      tracksMissedShots
        ? params.made1pt + params.made2pt + params.made3pt + params.missedShots > 0
          ? ((params.made1pt + params.made2pt + params.made3pt)
              / (params.made1pt + params.made2pt + params.made3pt + params.missedShots))
            * 100
          : null
        : null,
  });

  return {
    scope: "league",
    ...metrics,
    leagueName: params.leagueName,
    teamName: params.teamName,
    teamMatchesPlayed: params.teamMatchesPlayed,
    participationRate: params.participationRate,
    rankingPosition: params.rankingPosition,
  };
}
