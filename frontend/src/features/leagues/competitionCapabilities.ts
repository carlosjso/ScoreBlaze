import type { LeagueListItem } from "@/features/leagues/Leagues.types";

export type CompetitionStructure =
  | "LEAGUE_ONLY"
  | "LEAGUE_PLAYOFFS"
  | "GROUP_STAGE"
  | "SINGLE_ELIMINATION"
  | "DOUBLE_ELIMINATION"
  | "PLAY_IN_PLUS_BRACKET";

export type CompetitionCapabilities = {
  structure: CompetitionStructure;
  label: string;
  showStandings: boolean;
  showBracket: boolean;
  showGroups: boolean;
  showPlayIn: boolean;
  showLeagueCalendar: boolean;
  showLeagueRecords: boolean;
  showLeagueRounds: boolean;
  showTeams: boolean;
  showMatches: boolean;
  showSettings: boolean;
};

function structureLabelForLeague(
  league: Pick<LeagueListItem, "competitionType" | "finalPhaseEnabled" | "finalPhaseFormat" | "finalPhasePreset">,
  structure: CompetitionStructure,
) {
  if (league.competitionType === "LEAGUE" && structure === "DOUBLE_ELIMINATION") {
    return "Liga + Doble eliminacion";
  }

  if (league.competitionType === "LEAGUE" && structure === "PLAY_IN_PLUS_BRACKET") {
    return "Liga + Play-In + bracket";
  }

  if (league.competitionType === "LEAGUE" && league.finalPhaseEnabled) {
    return "Liga + Playoffs";
  }

  switch (structure) {
    case "LEAGUE_ONLY":
      return "Solo liga";
    case "LEAGUE_PLAYOFFS":
      return "Liga + Playoffs";
    case "GROUP_STAGE":
      return league.finalPhaseEnabled ? "Grupos + eliminatoria" : "Torneo por grupos";
    case "SINGLE_ELIMINATION":
      return "Eliminatoria directa";
    case "DOUBLE_ELIMINATION":
      return "Doble eliminacion";
    case "PLAY_IN_PLUS_BRACKET":
      return "Play-In + bracket";
  }
}

export function inferCompetitionStructure(
  league: Pick<LeagueListItem, "competitionType" | "finalPhaseEnabled" | "finalPhaseFormat" | "finalPhasePreset">,
): CompetitionStructure {
  if (league.competitionType === "ELIMINATION") {
    if (league.finalPhaseFormat === "DOUBLE_ELIMINATION") {
      return "DOUBLE_ELIMINATION";
    }

    if (league.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET") {
      return "PLAY_IN_PLUS_BRACKET";
    }

    return "SINGLE_ELIMINATION";
  }

  if (league.competitionType === "GROUPS") {
    return "GROUP_STAGE";
  }

  if (!league.finalPhaseEnabled) {
    return "LEAGUE_ONLY";
  }

  if (league.finalPhaseFormat === "DOUBLE_ELIMINATION") {
    return "DOUBLE_ELIMINATION";
  }

  if (league.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET") {
    return "PLAY_IN_PLUS_BRACKET";
  }

  if (league.finalPhasePreset === "CUSTOM") {
    return "SINGLE_ELIMINATION";
  }

  return "LEAGUE_PLAYOFFS";
}

export function getCompetitionCapabilities(
  league: Pick<LeagueListItem, "competitionType" | "finalPhaseEnabled" | "finalPhaseFormat" | "finalPhasePreset">,
): CompetitionCapabilities {
  const structure = inferCompetitionStructure(league);
  const hasGroupStage = structure === "GROUP_STAGE";
  const hasRegularSeason = league.competitionType === "LEAGUE";
  const hasBracket = hasGroupStage ? league.finalPhaseEnabled : structure !== "LEAGUE_ONLY";

  return {
    structure,
    label: structureLabelForLeague(league, structure),
    showStandings: hasRegularSeason || hasGroupStage,
    showBracket: hasBracket,
    showGroups: hasGroupStage,
    showPlayIn: structure === "PLAY_IN_PLUS_BRACKET",
    showLeagueCalendar: hasRegularSeason || hasGroupStage,
    showLeagueRecords: true,
    showLeagueRounds: hasRegularSeason || hasGroupStage,
    showTeams: true,
    showMatches: true,
    showSettings: true,
  };
}
