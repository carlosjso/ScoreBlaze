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

export function buildHistoricalTeamStats(
  teamId: number,
  matches: ApiMatch[],
  teamStat: ApiTeamStat | null,
): TeamHistoricalStats {
  const teamMatches = matches.filter((match) => match.team_a_id === teamId || match.team_b_id === teamId);
  const finishedMatches = teamMatches.filter(
    (match) => match.status === "finished" && match.score_team_a !== null && match.score_team_b !== null,
  );
  const liveMatchesCount = teamMatches.filter((match) => match.status === "live").length;
  const scheduledMatchesCount = teamMatches.filter((match) => match.status === "scheduled").length;

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  finishedMatches.forEach((match) => {
    const isTeamA = match.team_a_id === teamId;
    const ownScore = isTeamA ? match.score_team_a ?? 0 : match.score_team_b ?? 0;
    const rivalScore = isTeamA ? match.score_team_b ?? 0 : match.score_team_a ?? 0;

    pointsFor += ownScore;
    pointsAgainst += rivalScore;

    if (ownScore === rivalScore || match.is_draw) {
      draws += 1;
      return;
    }

    if (ownScore > rivalScore) {
      wins += 1;
    } else {
      losses += 1;
    }
  });

  const matchesPlayed = finishedMatches.length;
  const pointsDifference = pointsFor - pointsAgainst;
  const quickMatchesCount = teamMatches.filter((match) => match.league_id === null).length;
  const leagueMatchesCount = teamMatches.filter((match) => match.league_id !== null).length;
  const lastFinishedMatch =
    [...finishedMatches].sort((left, right) => right.match_date.localeCompare(left.match_date))[0] ?? null;

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
  const finishedMatches = teamMatches.filter(
    (match) => match.status === "finished" && match.scoreTeamA !== null && match.scoreTeamB !== null,
  );

  let wins = 0;
  let losses = 0;
  let draws = 0;
  let pointsFor = 0;
  let pointsAgainst = 0;

  finishedMatches.forEach((match) => {
    const isTeamA = match.teamAId === teamId;
    const ownScore = isTeamA ? match.scoreTeamA ?? 0 : match.scoreTeamB ?? 0;
    const rivalScore = isTeamA ? match.scoreTeamB ?? 0 : match.scoreTeamA ?? 0;

    pointsFor += ownScore;
    pointsAgainst += rivalScore;

    if (ownScore === rivalScore || match.isDraw) {
      draws += 1;
      return;
    }

    if (ownScore > rivalScore) {
      wins += 1;
    } else {
      losses += 1;
    }
  });

  const matchesPlayed = finishedMatches.length;

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
      [...finishedMatches].sort((left, right) => right.matchDate.localeCompare(left.matchDate))[0] ?? null,
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
