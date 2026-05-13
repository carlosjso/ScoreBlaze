import type { LeagueStandingRow } from "@/features/leagues/Leagues.types";
import type { ApiMatch, QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";
import type { ApiTeamStat, TeamHistoricalStats, TeamLeagueStats } from "@/features/teams/Teams.types";

const LEAGUE_STANDINGS_WIN_POINTS = 2;
const LEAGUE_STANDINGS_DRAW_POINTS = 1;

export function formatTeamStatsDateLabel(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(parsed);
}

function resolveApiMatchOutcome(teamId: number, match: ApiMatch) {
  if (match.score_team_a !== null && match.score_team_b !== null) {
    const isTeamA = match.team_a_id === teamId;
    const ownScore = isTeamA ? match.score_team_a : match.score_team_b;
    const rivalScore = isTeamA ? match.score_team_b : match.score_team_a;

    return {
      ownScore,
      rivalScore,
      isDraw: ownScore === rivalScore || match.is_draw,
      isWin: ownScore > rivalScore,
      canCountResult: true,
      hasScore: true,
    };
  }

  if (match.is_draw) {
    return {
      ownScore: null,
      rivalScore: null,
      isDraw: true,
      isWin: false,
      canCountResult: true,
      hasScore: false,
    };
  }

  if (match.winner_team_id !== null) {
    return {
      ownScore: null,
      rivalScore: null,
      isDraw: false,
      isWin: match.winner_team_id === teamId,
      canCountResult: true,
      hasScore: false,
    };
  }

  return {
    ownScore: null,
    rivalScore: null,
    isDraw: false,
    isWin: false,
    canCountResult: false,
    hasScore: false,
  };
}

function resolveQuickMatchOutcome(teamId: number, match: QuickMatchListItem) {
  if (match.scoreTeamA !== null && match.scoreTeamB !== null) {
    const isTeamA = match.teamAId === teamId;
    const ownScore = isTeamA ? match.scoreTeamA : match.scoreTeamB;
    const rivalScore = isTeamA ? match.scoreTeamB : match.scoreTeamA;

    return {
      ownScore,
      rivalScore,
      isDraw: ownScore === rivalScore || match.isDraw,
      isWin: ownScore > rivalScore,
      canCountResult: true,
      hasScore: true,
    };
  }

  if (match.isDraw) {
    return {
      ownScore: null,
      rivalScore: null,
      isDraw: true,
      isWin: false,
      canCountResult: true,
      hasScore: false,
    };
  }

  if (match.winnerTeamId !== null) {
    return {
      ownScore: null,
      rivalScore: null,
      isDraw: false,
      isWin: match.winnerTeamId === teamId,
      canCountResult: true,
      hasScore: false,
    };
  }

  return {
    ownScore: null,
    rivalScore: null,
    isDraw: false,
    isWin: false,
    canCountResult: false,
    hasScore: false,
  };
}

export function buildHistoricalTeamStats(
  teamId: number,
  matches: ApiMatch[],
  teamStat: ApiTeamStat | null,
): TeamHistoricalStats {
  const teamMatches = matches.filter((match) => match.team_a_id === teamId || match.team_b_id === teamId);
  const historicalMatches = teamMatches.filter(
    (match) =>
      (match.status === "finished" || match.status === "live")
      && resolveApiMatchOutcome(teamId, match).canCountResult,
  );
  const liveMatchesCount = teamMatches.filter((match) => match.status === "live").length;
  const scheduledMatchesCount = teamMatches.filter((match) => match.status === "scheduled").length;

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  historicalMatches.forEach((match) => {
    const outcome = resolveApiMatchOutcome(teamId, match);

    if (outcome.hasScore) {
      pointsFor += outcome.ownScore ?? 0;
      pointsAgainst += outcome.rivalScore ?? 0;
    }

    if (outcome.isDraw) {
      draws += 1;
      return;
    }

    if (outcome.isWin) {
      wins += 1;
    } else {
      losses += 1;
    }
  });

  const matchesPlayed = historicalMatches.length;
  const pointsDifference = pointsFor - pointsAgainst;
  const quickMatchesCount = historicalMatches.filter((match) => match.league_id === null).length;
  const leagueMatchesCount = historicalMatches.filter((match) => match.league_id !== null).length;
  const lastFinishedMatch =
    [...historicalMatches].sort((left, right) => right.match_date.localeCompare(left.match_date))[0] ?? null;

  return {
    scope: "historical",
    matchesPlayed,
    wins,
    losses,
    draws,
    pointsFor,
    pointsAgainst,
    pointsDifference,
    winRate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : null,
    averagePointsFor: matchesPlayed > 0 ? pointsFor / matchesPlayed : null,
    averagePointsAgainst: matchesPlayed > 0 ? pointsAgainst / matchesPlayed : null,
    quickMatchesCount,
    leagueMatchesCount,
    liveMatchesCount,
    scheduledMatchesCount,
    totalTeamFouls: teamStat?.total_team_fouls ?? null,
    lastMatchDate: lastFinishedMatch ? formatTeamStatsDateLabel(lastFinishedMatch.match_date) : null,
    updatedAt: teamStat?.updated_at ?? null,
  };
}

function buildFallbackLeagueBalance(teamId: number, matches: QuickMatchListItem[]) {
  const teamMatches = matches.filter((match) => match.teamAId === teamId || match.teamBId === teamId);
  const resolvedMatches = teamMatches.filter(
    (match) =>
      (match.status === "finished" || match.status === "live")
      && resolveQuickMatchOutcome(teamId, match).canCountResult,
  );

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  resolvedMatches.forEach((match) => {
    const outcome = resolveQuickMatchOutcome(teamId, match);

    if (outcome.hasScore) {
      pointsFor += outcome.ownScore ?? 0;
      pointsAgainst += outcome.rivalScore ?? 0;
    }

    if (outcome.isDraw) {
      draws += 1;
      return;
    }

    if (outcome.isWin) {
      wins += 1;
    } else {
      losses += 1;
    }
  });

  const matchesPlayed = resolvedMatches.length;

  return {
    matchesPlayed,
    wins,
    losses,
    draws,
    pointsFor,
    pointsAgainst,
    pointsDifference: pointsFor - pointsAgainst,
    standingsPoints: wins * LEAGUE_STANDINGS_WIN_POINTS + draws * LEAGUE_STANDINGS_DRAW_POINTS,
    lastFinishedMatch:
      [...resolvedMatches].sort((left, right) => right.matchDate.localeCompare(left.matchDate))[0] ?? null,
  };
}

export function buildLeagueTeamStats({
  teamId,
  leagueId,
  leagueName,
  matches,
  standingsRow,
  updatedAt = null,
}: {
  teamId: number;
  leagueId: number;
  leagueName: string;
  matches: QuickMatchListItem[];
  standingsRow: LeagueStandingRow | null;
  updatedAt?: string | null;
}): TeamLeagueStats {
  const teamMatches = matches.filter((match) => match.teamAId === teamId || match.teamBId === teamId);
  const liveMatchesCount = teamMatches.filter((match) => match.status === "live").length;
  const scheduledMatchesCount = teamMatches.filter((match) => match.status === "scheduled").length;
  const fallback = buildFallbackLeagueBalance(teamId, teamMatches);
  const matchesPlayed = standingsRow?.matchesPlayed ?? fallback.matchesPlayed;
  const pointsFor = standingsRow?.pointsFor ?? fallback.pointsFor;
  const pointsAgainst = standingsRow?.pointsAgainst ?? fallback.pointsAgainst;
  const pointsDifference = standingsRow?.pointsDifference ?? fallback.pointsDifference;
  const wins = standingsRow?.wins ?? fallback.wins;
  const losses = standingsRow?.losses ?? fallback.losses;
  const draws = standingsRow?.draws ?? fallback.draws;
  const standingsPoints = standingsRow?.standingsPoints ?? fallback.standingsPoints;

  return {
    scope: "league",
    leagueId,
    leagueName,
    leaguePosition: standingsRow?.position ?? null,
    matchesPlayed,
    wins,
    losses,
    draws,
    pointsFor,
    pointsAgainst,
    pointsDifference,
    standingsPoints,
    winRate: matchesPlayed > 0 ? (wins / matchesPlayed) * 100 : null,
    averagePointsFor: matchesPlayed > 0 ? pointsFor / matchesPlayed : null,
    averagePointsAgainst: matchesPlayed > 0 ? pointsAgainst / matchesPlayed : null,
    liveMatchesCount,
    scheduledMatchesCount,
    totalTeamFouls: standingsRow?.totalTeamFouls ?? null,
    lastMatchDate: fallback.lastFinishedMatch ? formatTeamStatsDateLabel(fallback.lastFinishedMatch.matchDate) : null,
    updatedAt,
  };
}
