import type { LeagueGroupStageConfig } from "@/features/leagues/Leagues.types";

export function createDefaultGroupStageConfig(): LeagueGroupStageConfig {
  return {
    mode: "MANUAL",
    groups: [
      { key: "A", name: "Grupo A", teamIds: [] },
      { key: "B", name: "Grupo B", teamIds: [] },
    ],
    qualifiersPerGroup: 0,
    bestExtraSlots: 0,
    wildcardRanking: "WIN_PERCENTAGE",
    wildcardTiebreakers: ["AVERAGE_POINT_DIFFERENCE", "AVERAGE_POINTS_FOR"],
  };
}
