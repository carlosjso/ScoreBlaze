import type { LeagueStandingRow } from "@/features/leagues/Leagues.types";
import type { QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";

const LEAGUE_STANDINGS_WIN_POINTS = 2;
const LEAGUE_STANDINGS_DRAW_POINTS = 1;

export type LiveLeagueStandingRow = LeagueStandingRow & {
  isLive: boolean;
  liveMatchCount: number;
  liveSummary: string | null;
};

export type LiveLeagueStandingsSnapshot = {
  rows: LiveLeagueStandingRow[];
  liveMatchCount: number;
  liveTeamsCount: number;
};

function createEmptyRow(teamId: number, teamName: string): LiveLeagueStandingRow {
  return {
    position: 0,
    teamId,
    teamName,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    pointsDifference: 0,
    standingsPoints: 0,
    totalTeamFouls: 0,
    isLive: false,
    liveMatchCount: 0,
    liveSummary: null,
  };
}

function sortStandings(rows: LiveLeagueStandingRow[]) {
  return [...rows].sort((left, right) => {
    if (right.standingsPoints !== left.standingsPoints) {
      return right.standingsPoints - left.standingsPoints;
    }

    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }

    if (right.pointsDifference !== left.pointsDifference) {
      return right.pointsDifference - left.pointsDifference;
    }

    if (right.pointsFor !== left.pointsFor) {
      return right.pointsFor - left.pointsFor;
    }

    const nameDiff = left.teamName.localeCompare(right.teamName, "es", { sensitivity: "base" });
    if (nameDiff !== 0) {
      return nameDiff;
    }

    return right.teamId - left.teamId;
  });
}

export function buildLiveLeagueStandings(
  baseStandings: LeagueStandingRow[],
  matches: QuickMatchListItem[],
): LiveLeagueStandingsSnapshot {
  const rowsByTeamId = new Map<number, LiveLeagueStandingRow>();
  const liveSummaryByTeamId = new Map<number, string[]>();
  const liveMatches = matches.filter((match) => match.status === "live");

  baseStandings.forEach((row) => {
    rowsByTeamId.set(row.teamId, {
      ...row,
      isLive: false,
      liveMatchCount: 0,
      liveSummary: null,
    });
  });

  liveMatches.forEach((match) => {
    const scoreTeamA = match.scoreTeamA ?? 0;
    const scoreTeamB = match.scoreTeamB ?? 0;
    const teamARow = rowsByTeamId.get(match.teamAId) ?? createEmptyRow(match.teamAId, match.teamAName);
    const teamBRow = rowsByTeamId.get(match.teamBId) ?? createEmptyRow(match.teamBId, match.teamBName);

    rowsByTeamId.set(match.teamAId, teamARow);
    rowsByTeamId.set(match.teamBId, teamBRow);

    teamARow.matchesPlayed += 1;
    teamBRow.matchesPlayed += 1;
    teamARow.pointsFor += scoreTeamA;
    teamARow.pointsAgainst += scoreTeamB;
    teamBRow.pointsFor += scoreTeamB;
    teamBRow.pointsAgainst += scoreTeamA;

    if (scoreTeamA === scoreTeamB) {
      teamARow.draws += 1;
      teamBRow.draws += 1;
      teamARow.standingsPoints += LEAGUE_STANDINGS_DRAW_POINTS;
      teamBRow.standingsPoints += LEAGUE_STANDINGS_DRAW_POINTS;
    } else if (scoreTeamA > scoreTeamB) {
      teamARow.wins += 1;
      teamARow.standingsPoints += LEAGUE_STANDINGS_WIN_POINTS;
      teamBRow.losses += 1;
    } else {
      teamBRow.wins += 1;
      teamBRow.standingsPoints += LEAGUE_STANDINGS_WIN_POINTS;
      teamARow.losses += 1;
    }

    teamARow.pointsDifference = teamARow.pointsFor - teamARow.pointsAgainst;
    teamBRow.pointsDifference = teamBRow.pointsFor - teamBRow.pointsAgainst;

    teamARow.isLive = true;
    teamBRow.isLive = true;

    const teamASummary = `${scoreTeamA}-${scoreTeamB} vs ${match.teamBName}`;
    const teamBSummary = `${scoreTeamB}-${scoreTeamA} vs ${match.teamAName}`;

    liveSummaryByTeamId.set(match.teamAId, [...(liveSummaryByTeamId.get(match.teamAId) ?? []), teamASummary]);
    liveSummaryByTeamId.set(match.teamBId, [...(liveSummaryByTeamId.get(match.teamBId) ?? []), teamBSummary]);
  });

  const rows = sortStandings(Array.from(rowsByTeamId.values())).map((row, index) => {
    const liveSummaries = liveSummaryByTeamId.get(row.teamId) ?? [];
    const liveSummary =
      liveSummaries.length === 0
        ? null
        : liveSummaries.length === 1
          ? `En juego: ${liveSummaries[0]}`
          : `En juego: ${liveSummaries[0]} y +${liveSummaries.length - 1}`;

    return {
      ...row,
      position: index + 1,
      liveMatchCount: liveSummaries.length,
      liveSummary,
    };
  });

  return {
    rows,
    liveMatchCount: liveMatches.length,
    liveTeamsCount: rows.filter((row) => row.isLive).length,
  };
}
