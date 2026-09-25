import type { LeagueGroupStageConfig, LeagueRegularSeasonFormat } from "@/features/leagues/Leagues.types";
import type { QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";

export type PendingGroupFixture = {
  teamAId: number;
  teamBId: number;
  label: string;
  remainingMatches: number;
};

export type GroupScheduleCoverage = {
  groupKey: string;
  groupName: string;
  teamCount: number;
  pairCount: number;
  expectedMatches: number;
  coveredMatches: number;
  registeredMatches: number;
  finishedMatches: number;
  firstRoundCoveredPairs: number;
  secondRoundCoveredPairs: number;
  duplicateMatches: number;
  pendingFixtures: PendingGroupFixture[];
};

export type ScheduleAudit = {
  missingMatches: number;
  unfinishedMatches: number;
  duplicateMatches: number;
};

function pairKey(teamAId: number, teamBId: number) {
  return teamAId < teamBId ? `${teamAId}:${teamBId}` : `${teamBId}:${teamAId}`;
}

export function summarizeLeagueSchedule(
  teamIds: number[],
  format: LeagueRegularSeasonFormat,
  matches: QuickMatchListItem[],
) {
  const registeredTeamIds = new Set(teamIds);
  const requiredMatchesPerPair = format === "DOUBLE_ROUND" ? 2 : 1;
  const relevantMatches = matches.filter((match) =>
    match.competitionStage === "REGULAR_SEASON"
    && registeredTeamIds.has(match.teamAId)
    && registeredTeamIds.has(match.teamBId),
  );
  const matchCountByPair = new Map<string, number>();
  relevantMatches.forEach((match) => {
    const key = pairKey(match.teamAId, match.teamBId);
    matchCountByPair.set(key, (matchCountByPair.get(key) ?? 0) + 1);
  });
  const pairCount = teamIds.length * (teamIds.length - 1) / 2;
  const coveredMatches = Array.from(matchCountByPair.values()).reduce(
    (total, count) => total + Math.min(count, requiredMatchesPerPair),
    0,
  );
  return {
    missingMatches: Math.max(0, pairCount * requiredMatchesPerPair - coveredMatches),
    unfinishedMatches: relevantMatches.filter((match) => match.status !== "finished").length,
  };
}

export function buildGroupScheduleCoverage(
  config: LeagueGroupStageConfig | null,
  format: LeagueRegularSeasonFormat,
  matches: QuickMatchListItem[],
  teamNameById: Map<number, string>,
): GroupScheduleCoverage[] {
  if (!config) return [];

  const requiredMatchesPerPair = format === "DOUBLE_ROUND" ? 2 : 1;

  return config.groups.map((group) => {
    const groupTeamIds = new Set(group.teamIds);
    const relevantMatches = matches.filter((match) =>
      match.competitionStage === "GROUP_STAGE"
      && match.groupStageGroupKey === group.key
      && groupTeamIds.has(match.teamAId)
      && groupTeamIds.has(match.teamBId),
    );
    const matchCountByPair = new Map<string, number>();
    relevantMatches.forEach((match) => {
      const key = pairKey(match.teamAId, match.teamBId);
      matchCountByPair.set(key, (matchCountByPair.get(key) ?? 0) + 1);
    });

    const pendingFixtures: PendingGroupFixture[] = [];
    let coveredMatches = 0;
    let firstRoundCoveredPairs = 0;
    let secondRoundCoveredPairs = 0;
    let duplicateMatches = 0;

    group.teamIds.forEach((teamAId, index) => {
      group.teamIds.slice(index + 1).forEach((teamBId) => {
        const registeredCount = matchCountByPair.get(pairKey(teamAId, teamBId)) ?? 0;
        coveredMatches += Math.min(registeredCount, requiredMatchesPerPair);
        if (registeredCount >= 1) firstRoundCoveredPairs += 1;
        if (registeredCount >= 2) secondRoundCoveredPairs += 1;
        duplicateMatches += Math.max(0, registeredCount - requiredMatchesPerPair);

        if (registeredCount < requiredMatchesPerPair) {
          pendingFixtures.push({
            teamAId,
            teamBId,
            label: `${teamNameById.get(teamAId) ?? `Equipo ${teamAId}`} vs ${teamNameById.get(teamBId) ?? `Equipo ${teamBId}`}`,
            remainingMatches: requiredMatchesPerPair - registeredCount,
          });
        }
      });
    });

    const pairCount = group.teamIds.length * (group.teamIds.length - 1) / 2;
    return {
      groupKey: group.key,
      groupName: group.name,
      teamCount: group.teamIds.length,
      pairCount,
      expectedMatches: pairCount * requiredMatchesPerPair,
      coveredMatches,
      registeredMatches: relevantMatches.length,
      finishedMatches: relevantMatches.filter((match) => match.status === "finished").length,
      firstRoundCoveredPairs,
      secondRoundCoveredPairs,
      duplicateMatches,
      pendingFixtures,
    };
  });
}

export function summarizeGroupSchedule(
  config: LeagueGroupStageConfig | null,
  format: LeagueRegularSeasonFormat,
  matches: QuickMatchListItem[],
): ScheduleAudit {
  const coverage = buildGroupScheduleCoverage(config, format, matches, new Map());
  return coverage.reduce<ScheduleAudit>((audit, group) => ({
    missingMatches: audit.missingMatches + Math.max(0, group.expectedMatches - group.coveredMatches),
    unfinishedMatches: audit.unfinishedMatches + Math.max(0, group.registeredMatches - group.finishedMatches),
    duplicateMatches: audit.duplicateMatches + group.duplicateMatches,
  }), { missingMatches: 0, unfinishedMatches: 0, duplicateMatches: 0 });
}

export function buildLeagueScheduleCoverage(
  teamIds: number[],
  format: LeagueRegularSeasonFormat,
  matches: QuickMatchListItem[],
  teamNameById: Map<number, string>,
): GroupScheduleCoverage[] {
  if (teamIds.length < 2) return [];

  return buildGroupScheduleCoverage(
    {
      mode: "UNIFORM",
      groups: [{ key: "LEAGUE", name: "Calendario general", teamIds }],
      qualifiersPerGroup: 0,
      bestExtraSlots: 0,
      wildcardRanking: "WIN_PERCENTAGE",
      wildcardTiebreakers: ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
    },
    format,
    matches.map((match) => match.competitionStage === "REGULAR_SEASON" ? { ...match, competitionStage: "GROUP_STAGE", groupStageGroupKey: "LEAGUE" } : match),
    teamNameById,
  );
}
