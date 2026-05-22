import type { UseFormSetValue } from "react-hook-form";

import type {
  LeagueFinalPhaseFormatOption,
  LeagueFinalPhasePresetOption,
  LeagueFormValues,
} from "@/features/leagues/Leagues.types";
import { leagueFinalPhasePresetDefaults } from "@/features/leagues/schemas/Leagues.schema";

export const leagueFinalPhasePresetLabels: Record<LeagueFinalPhasePresetOption, string> = {
  TOP_4_SINGLE_GAME: "Liga + Top 4 - Partido unico",
  TOP_8_SINGLE_GAME: "Liga + Top 8 - Partido unico",
  TOP_8_HOME_AWAY: "Liga + Top 8 - Ida y vuelta",
  TOP_6_SINGLE_GAME_WITH_BYES: "Liga + Top 6 - Bye 1ro y 2do",
  TOP_16_SINGLE_GAME: "Top 16 - Partido unico",
  TOP_32_SINGLE_GAME: "Top 32 - Partido unico",
  NBA_PLAY_IN_TOP_10: "Liga + Play-In + Playoffs",
  DOUBLE_ELIMINATION_TOP_8: "Doble eliminacion",
  DOUBLE_ELIMINATION_TOP_16: "Doble eliminacion - Top 16",
  CUSTOM: "Personalizado",
};

export const leagueFinalPhaseFormatLabels: Record<LeagueFinalPhaseFormatOption, string> = {
  SINGLE_ELIMINATION: "Eliminacion simple",
  DOUBLE_ELIMINATION: "Doble eliminacion",
  PLAY_IN_PLUS_BRACKET: "Play-In + bracket",
};

export type MainFinalPhasePresetOption =
  | "LEAGUE_ONLY"
  | "TOP_4_SINGLE_GAME"
  | "TOP_8_SINGLE_GAME"
  | "TOP_8_HOME_AWAY"
  | "TOP_6_SINGLE_GAME_WITH_BYES"
  | "TOP_16_SINGLE_GAME"
  | "TOP_32_SINGLE_GAME"
  | "NBA_PLAY_IN_TOP_10"
  | "DOUBLE_ELIMINATION_TOP_8"
  | "DOUBLE_ELIMINATION_TOP_16"
  | "TOP_8_BEST_OF_3";

export const mainFinalPhasePresetOptions: Array<{ value: MainFinalPhasePresetOption; label: string }> = [
  { value: "LEAGUE_ONLY", label: "Solo liga" },
  { value: "TOP_4_SINGLE_GAME", label: "Liga + Top 4 - Partido unico" },
  { value: "TOP_8_SINGLE_GAME", label: "Liga + Top 8 - Partido unico" },
  { value: "TOP_8_HOME_AWAY", label: "Liga + Top 8 - Ida y vuelta" },
  { value: "TOP_6_SINGLE_GAME_WITH_BYES", label: "Liga + Top 6 - Con byes para 1ro y 2do" },
  { value: "TOP_16_SINGLE_GAME", label: "Top 16 - Partido unico" },
  { value: "TOP_32_SINGLE_GAME", label: "Top 32 - Partido unico" },
  { value: "NBA_PLAY_IN_TOP_10", label: "Liga + Play-In + Playoffs" },
  { value: "DOUBLE_ELIMINATION_TOP_8", label: "Doble eliminacion - Top 8" },
  { value: "DOUBLE_ELIMINATION_TOP_16", label: "Doble eliminacion - Top 16" },
  { value: "TOP_8_BEST_OF_3", label: "Top 8 - Mejor de 3 (custom)" },
];

const backendPresetValues = new Set<LeagueFinalPhasePresetOption>([
  "TOP_4_SINGLE_GAME",
  "TOP_8_SINGLE_GAME",
  "TOP_8_HOME_AWAY",
  "TOP_6_SINGLE_GAME_WITH_BYES",
  "TOP_16_SINGLE_GAME",
  "TOP_32_SINGLE_GAME",
  "NBA_PLAY_IN_TOP_10",
  "DOUBLE_ELIMINATION_TOP_8",
  "DOUBLE_ELIMINATION_TOP_16",
]);

function setValue(
  setFormValue: UseFormSetValue<LeagueFormValues>,
  field: keyof LeagueFormValues,
  value: LeagueFormValues[keyof LeagueFormValues],
) {
  setFormValue(field, value, {
    shouldDirty: true,
    shouldValidate: true,
  });
}

export function applyPresetDefaults(
  setFormValue: UseFormSetValue<LeagueFormValues>,
  preset: LeagueFinalPhasePresetOption,
) {
  const presetDefaults = leagueFinalPhasePresetDefaults[preset];
  setValue(setFormValue, "finalPhasePreset", preset);
  setValue(setFormValue, "finalPhaseFormat", presetDefaults.finalPhaseFormat);
  setValue(setFormValue, "finalPhaseQualifiedTeams", presetDefaults.finalPhaseQualifiedTeams);
  setValue(setFormValue, "finalPhaseByes", presetDefaults.finalPhaseByes);
  setValue(setFormValue, "finalPhaseTwoLegs", presetDefaults.finalPhaseTwoLegs);
  setValue(setFormValue, "finalPhaseThirdPlaceMatch", presetDefaults.finalPhaseThirdPlaceMatch);
  setValue(setFormValue, "finalPhaseSeededHomeAdvantage", presetDefaults.finalPhaseSeededHomeAdvantage);
  setValue(setFormValue, "finalPhasePlayInSlots", presetDefaults.finalPhasePlayInSlots);
  setValue(setFormValue, "finalPhaseRoundBestOf", presetDefaults.finalPhaseRoundBestOf);
  setValue(setFormValue, "finalPhaseFinalBestOf", presetDefaults.finalPhaseFinalBestOf);
  setValue(setFormValue, "finalPhaseReseedEachRound", presetDefaults.finalPhaseReseedEachRound);
  setValue(setFormValue, "finalPhaseGrandFinalReset", presetDefaults.finalPhaseGrandFinalReset);
}

export function applyMainFinalPhasePreset(
  setFormValue: UseFormSetValue<LeagueFormValues>,
  preset: MainFinalPhasePresetOption,
) {
  if (preset === "LEAGUE_ONLY") {
    setValue(setFormValue, "finalPhaseEnabled", false);
    applyPresetDefaults(setFormValue, "TOP_8_SINGLE_GAME");
    return;
  }

  setValue(setFormValue, "finalPhaseEnabled", true);

  if (backendPresetValues.has(preset as LeagueFinalPhasePresetOption)) {
    applyPresetDefaults(setFormValue, preset as LeagueFinalPhasePresetOption);
    return;
  }

  setValue(setFormValue, "finalPhasePreset", "CUSTOM");
  setValue(setFormValue, "finalPhaseQualifiedTeams", 8);
  setValue(setFormValue, "finalPhaseByes", 0);
  setValue(setFormValue, "finalPhaseThirdPlaceMatch", false);
  setValue(setFormValue, "finalPhaseSeededHomeAdvantage", true);
  setValue(setFormValue, "finalPhaseReseedEachRound", false);
  setValue(setFormValue, "finalPhaseGrandFinalReset", false);

  if (preset === "TOP_8_BEST_OF_3") {
    setValue(setFormValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
    setValue(setFormValue, "finalPhaseTwoLegs", false);
    setValue(setFormValue, "finalPhasePlayInSlots", 0);
    setValue(setFormValue, "finalPhaseRoundBestOf", 3);
    setValue(setFormValue, "finalPhaseFinalBestOf", 3);
    return;
  }

  setValue(setFormValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
  setValue(setFormValue, "finalPhaseTwoLegs", false);
  setValue(setFormValue, "finalPhasePlayInSlots", 0);
  setValue(setFormValue, "finalPhaseRoundBestOf", 1);
  setValue(setFormValue, "finalPhaseFinalBestOf", 1);
}
