import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Save, SlidersHorizontal, Sparkles, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, type FieldErrors, type Resolver, type UseFormSetValue } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { LeagueGroupStageEditor } from "@/features/leagues/components/LeagueGroupStageEditor";
import { getCompetitionCapabilities, inferCompetitionStructure } from "@/features/leagues/competitionCapabilities";
import { leagueFinalPhaseFormatLabels } from "@/features/leagues/finalPhaseConfig";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import {
  leagueFinalPhaseBestOfOptions,
  leagueFinalPhaseQualifiedTeamsOptions,
  type LeagueFinalPhaseFormatOption,
  type LeagueFinalPhasePresetOption,
  type LeagueFormValues,
  type LeagueStandingsTiebreaker,
} from "@/features/leagues/Leagues.types";
import { leagueFormSchema, toLeagueFormValues } from "@/features/leagues/schemas/Leagues.schema";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { useQuery } from "@tanstack/react-query";
import { FormErrors } from "@/features/leagues/components/FormErrors";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, PageHeader, Panel, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

const optionButtonClass =
  "rounded-[18px] border px-4 py-3 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

type EliminationMode = "SINGLE_GAME" | "BEST_OF";

const standingsTiebreakerLabels: Record<LeagueStandingsTiebreaker, { title: string; description: string }> = {
  HEAD_TO_HEAD: { title: "Enfrentamiento directo", description: "Compara lo ocurrido entre los equipos empatados." },
  POINT_DIFFERENCE: { title: "Diferencia de puntos", description: "Favorece al equipo con mejor diferencia anotada." },
  POINTS_FOR: { title: "Puntos anotados", description: "Favorece al equipo con mas puntos a favor." },
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ChoiceCard({
  active,
  title,
  description,
  disabled,
  onClick,
}: {
  active?: boolean;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "min-h-[112px] rounded-[22px] border px-4 py-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        active
          ? "border-orange-200 bg-[linear-gradient(180deg,rgba(255,247,237,0.96),#ffffff)] text-slate-950 shadow-[0_16px_30px_rgba(249,115,22,0.10)]"
          : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50/40 hover:text-slate-900",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
            active ? "bg-white text-orange-700" : "bg-slate-100 text-slate-400",
          )}
        >
          {active ? "Activo" : disabled ? "No disponible" : "Elegir"}
        </span>
      </div>
    </button>
  );
}

function OptionButton({
  active,
  children,
  disabled,
  onClick,
  title,
}: {
  active?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        optionButtonClass,
        active
          ? "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_10px_20px_rgba(249,115,22,0.08)]"
          : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/70 hover:text-orange-700",
      )}
    >
      {children}
    </button>
  );
}

function CapabilityPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
      <span className="h-2 w-2 rounded-full bg-emerald-500" />
      {label}
    </span>
  );
}

function setFormValue<K extends keyof LeagueFormValues>(
  setValue: UseFormSetValue<LeagueFormValues>,
  field: K,
  value: LeagueFormValues[K],
) {
  type SetValueField = Parameters<UseFormSetValue<LeagueFormValues>>[0];
  type SetValueValue = Parameters<UseFormSetValue<LeagueFormValues>>[1];

  setValue(field as SetValueField, value as SetValueValue, { shouldDirty: true, shouldValidate: true });
}

function isPowerOfTwo(value: number) {
  return value > 0 && (value & (value - 1)) === 0;
}

function getRecommendedByes(qualifiedTeams: number) {
  if (qualifiedTeams <= 0 || isPowerOfTwo(qualifiedTeams)) {
    return 0;
  }

  const nextBracketSize = 2 ** Math.ceil(Math.log2(qualifiedTeams));
  return nextBracketSize - qualifiedTeams;
}

function getBracketRoundsLabel(qualifiedTeams: number, byes: number) {
  if (qualifiedTeams <= 2) {
    return "Final directa";
  }

  if (qualifiedTeams === 4 && byes === 0) {
    return "Semifinales + final";
  }

  if (qualifiedTeams === 6 && byes === 2) {
    return "Reclasificacion + semifinales + final";
  }

  if (qualifiedTeams === 8 && byes === 0) {
    return "Cuartos + semifinales + final";
  }

  if (qualifiedTeams === 16 && byes === 0) {
    return "Octavos + cuartos + semifinales + final";
  }

  return byes > 0 ? `Bracket de ${qualifiedTeams} con ${byes} byes` : `Bracket de ${qualifiedTeams}`;
}

function resolvePlayInSlotsForTeamCount(currentSlots: number, qualifiedTeams: number) {
  const compatibleSlots = Array.from({ length: Math.max(0, qualifiedTeams - 1) }, (_, index) => index + 1)
    .filter((slots) => slots % 2 === 0)
    .filter((slots) => {
      const mainBracketTeams = qualifiedTeams - slots / 2;
      return mainBracketTeams >= 2 && (mainBracketTeams & (mainBracketTeams - 1)) === 0;
    });
  if (compatibleSlots.length === 0) return 0;
  return compatibleSlots.reduce((closest, slots) => (
    Math.abs(slots - currentSlots) < Math.abs(closest - currentSlots) ? slots : closest
  ));
}

function getEliminationMode(values: LeagueFormValues): EliminationMode {
  if (values.finalPhaseTwoLegs) {
    return "SINGLE_GAME";
  }

  if (values.finalPhaseRoundBestOf > 1) {
    return "BEST_OF";
  }

  return "SINGLE_GAME";
}

function resolveFinalPhasePreset(values: LeagueFormValues): LeagueFinalPhasePresetOption {
  if (!values.finalPhaseEnabled) {
    return "TOP_8_SINGLE_GAME";
  }

  if (
    values.finalPhaseFormat === "SINGLE_ELIMINATION"
    && values.finalPhasePlayInSlots === 0
    && !values.finalPhaseThirdPlaceMatch
    && values.finalPhaseSeededHomeAdvantage
    && !values.finalPhaseReseedEachRound
    && !values.finalPhaseGrandFinalReset
  ) {
    if (
      values.finalPhaseQualifiedTeams === 4
      && values.finalPhaseByes === 0
      && !values.finalPhaseTwoLegs
      && values.finalPhaseRoundBestOf === 1
      && values.finalPhaseFinalBestOf === 1
    ) {
      return "TOP_4_SINGLE_GAME";
    }

    if (
      values.finalPhaseQualifiedTeams === 6
      && values.finalPhaseByes === 2
      && !values.finalPhaseTwoLegs
      && values.finalPhaseRoundBestOf === 1
      && values.finalPhaseFinalBestOf === 1
    ) {
      return "TOP_6_SINGLE_GAME_WITH_BYES";
    }

    if (
      values.finalPhaseQualifiedTeams === 8
      && values.finalPhaseByes === 0
      && !values.finalPhaseTwoLegs
      && values.finalPhaseRoundBestOf === 1
      && values.finalPhaseFinalBestOf === 1
    ) {
      return "TOP_8_SINGLE_GAME";
    }

    if (
      values.finalPhaseQualifiedTeams === 8
      && values.finalPhaseByes === 0
      && values.finalPhaseTwoLegs
      && values.finalPhaseRoundBestOf === 1
      && values.finalPhaseFinalBestOf === 1
    ) {
      return "TOP_8_HOME_AWAY";
    }

    if (
      values.finalPhaseQualifiedTeams === 16
      && values.finalPhaseByes === 0
      && !values.finalPhaseTwoLegs
      && values.finalPhaseRoundBestOf === 1
      && values.finalPhaseFinalBestOf === 1
    ) {
      return "TOP_16_SINGLE_GAME";
    }

    if (
      values.finalPhaseQualifiedTeams === 32
      && values.finalPhaseByes === 0
      && !values.finalPhaseTwoLegs
      && values.finalPhaseRoundBestOf === 1
      && values.finalPhaseFinalBestOf === 1
    ) {
      return "TOP_32_SINGLE_GAME";
    }
  }

  if (
    values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"
    && values.finalPhaseQualifiedTeams === 10
    && values.finalPhaseByes === 6
    && !values.finalPhaseTwoLegs
    && !values.finalPhaseThirdPlaceMatch
    && values.finalPhaseSeededHomeAdvantage
    && values.finalPhasePlayInSlots === 4
    && values.finalPhaseRoundBestOf === 1
    && values.finalPhaseFinalBestOf === 7
    && !values.finalPhaseReseedEachRound
    && !values.finalPhaseGrandFinalReset
  ) {
    return "NBA_PLAY_IN_TOP_10";
  }

  if (
    values.finalPhaseFormat === "DOUBLE_ELIMINATION"
    && values.finalPhaseByes === 0
    && !values.finalPhaseTwoLegs
    && !values.finalPhaseThirdPlaceMatch
    && !values.finalPhaseSeededHomeAdvantage
    && values.finalPhasePlayInSlots === 0
    && values.finalPhaseRoundBestOf === 1
    && values.finalPhaseFinalBestOf === 3
    && !values.finalPhaseReseedEachRound
    && values.finalPhaseGrandFinalReset
  ) {
    if (values.finalPhaseQualifiedTeams === 8) {
      return "DOUBLE_ELIMINATION_TOP_8";
    }

    if (values.finalPhaseQualifiedTeams === 16) {
      return "DOUBLE_ELIMINATION_TOP_16";
    }
  }

  return "CUSTOM";
}

function getFirstFinalPhaseError(errors: FieldErrors<LeagueFormValues>) {
  const fieldOrder: Array<keyof LeagueFormValues> = [
    "finalPhaseEnabled",
    "finalPhaseFormat",
    "finalPhaseQualifiedTeams",
    "finalPhaseByes",
    "finalPhasePlayInSlots",
    "finalPhaseTwoLegs",
    "finalPhaseRoundBestOf",
    "finalPhaseFinalBestOf",
    "finalPhaseGrandFinalReset",
    "finalPhasePreset",
  ];

  for (const fieldName of fieldOrder) {
    const error = errors[fieldName];
    if (error && typeof error.message === "string") {
      return error.message;
    }
  }

  return null;
}

export default function LeagueFinalPhaseSettingsPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;

  const leagueQuery = useQuery({
    queryKey: leaguesQueryKeys.detail(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeague(selectedLeagueId, signal),
    enabled: hasValidLeagueId,
  });

  const teamsQuery = useQuery({
    queryKey: teamsQueryKeys.catalog(),
    queryFn: ({ signal }) => teamsService.getCatalog(signal),
  });

  const { submitting, mutationError, mutationErrorMessage, clearMutationError, saveLeague } = useLeaguesMutations();

  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema) as Resolver<LeagueFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toLeagueFormValues(null),
  });

  const league = leagueQuery.data ?? null;
  const loading = leagueQuery.isPending;
  const values = watch();
  const [regularSeasonChangeConfirmed, setRegularSeasonChangeConfirmed] = useState(false);
  const hydratedLeagueIdRef = useRef<number | null>(null);
  const isEliminationCompetition = values.competitionType === "ELIMINATION";
  const isGroupCompetition = values.competitionType === "GROUPS";
  const directParticipantCount = new Set(values.teamIds).size;
  const canConfigureGroupStage = !isGroupCompetition || directParticipantCount >= 4;
  const registeredGroupTeams = useMemo(
    () => (teamsQuery.data ?? []).filter((team) => values.teamIds.includes(team.id)),
    [teamsQuery.data, values.teamIds],
  );
  const regularSeasonFormatChanged = Boolean(
    league
    && league.matchesCount > 0
    && league.regularSeasonFormat !== values.regularSeasonFormat,
  );
  const usesPlayIn = values.finalPhaseEnabled && !isEliminationCompetition && values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET";
  const usesDoubleElimination = values.finalPhaseEnabled && !isEliminationCompetition && values.finalPhaseFormat === "DOUBLE_ELIMINATION";
  const eliminationMode = getEliminationMode(values);
  const selectedQualifiedTeams = leagueFinalPhaseQualifiedTeamsOptions.includes(
    values.finalPhaseQualifiedTeams as (typeof leagueFinalPhaseQualifiedTeamsOptions)[number],
  )
    ? values.finalPhaseQualifiedTeams
    : "CUSTOM";
  const formatTeamCount = isEliminationCompetition ? directParticipantCount : values.finalPhaseQualifiedTeams;
  const playInAvailable = formatTeamCount >= 2
    && resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots || 4, formatTeamCount) > 0;
  const doubleEliminationAvailable = formatTeamCount >= 2 && isPowerOfTwo(formatTeamCount);
  const mainBracketTeamCount = usesPlayIn
    ? values.finalPhaseByes + Math.floor(values.finalPhasePlayInSlots / 2)
    : formatTeamCount;
  const thirdPlaceAvailable = mainBracketTeamCount >= 4;
  const finalPhaseError = getFirstFinalPhaseError(formState.errors);
  const heroSummaryItems = useMemo(
    () => {
      if (isGroupCompetition && !values.finalPhaseEnabled) {
        return ["Fase de grupos", values.regularSeasonFormat === "DOUBLE_ROUND" ? "Ida y vuelta" : "Una vuelta", "Sin llave final"];
      }

      if (!values.finalPhaseEnabled) {
        return ["Solo liga"];
      }

      const items = [
        leagueFinalPhaseFormatLabels[values.finalPhaseFormat],
        isEliminationCompetition
          ? `${directParticipantCount} participantes`
          : values.finalPhaseQualifiedTeams === 2 ? "Final directa" : `Top ${values.finalPhaseQualifiedTeams}`,
      ];

      if (values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET") {
        items.push(`${values.finalPhasePlayInSlots} cupos play-in`);
      }

      if (values.finalPhaseFormat === "SINGLE_ELIMINATION" && values.finalPhaseByes > 0) {
        items.push(`${values.finalPhaseByes} byes`);
      }

      if (values.finalPhaseRoundBestOf > 1 || values.finalPhaseFinalBestOf > 1) {
        items.push(`Series mejor de ${Math.max(values.finalPhaseRoundBestOf, values.finalPhaseFinalBestOf)}`);
      } else {
        items.push("Partido unico");
      }

      return items;
    },
    [directParticipantCount, isEliminationCompetition, isGroupCompetition, values],
  );
  const compactSummaryItems = heroSummaryItems.slice(0, 4);
  const hiddenSummaryCount = Math.max(0, heroSummaryItems.length - compactSummaryItems.length);
  const inferredStructure = useMemo(
    () =>
      inferCompetitionStructure({
        competitionType: values.competitionType,
        finalPhaseEnabled: values.finalPhaseEnabled,
        finalPhaseFormat: values.finalPhaseFormat,
        finalPhasePreset: values.finalPhasePreset,
      }),
    [values.competitionType, values.finalPhaseEnabled, values.finalPhaseFormat, values.finalPhasePreset],
  );
  const capabilities = useMemo(
    () =>
      getCompetitionCapabilities({
        competitionType: values.competitionType,
        finalPhaseEnabled: values.finalPhaseEnabled,
        finalPhaseFormat: values.finalPhaseFormat,
        finalPhasePreset: values.finalPhasePreset,
      }),
    [values.competitionType, values.finalPhaseEnabled, values.finalPhaseFormat, values.finalPhasePreset],
  );
  const previewLabel = isGroupCompetition
    ? "Torneo por grupos"
    : !values.finalPhaseEnabled
    ? "Temporada regular"
    : inferredStructure === "DOUBLE_ELIMINATION"
      ? "Doble eliminacion"
      : inferredStructure === "PLAY_IN_PLUS_BRACKET"
        ? "Play-In + playoffs"
      : isEliminationCompetition
          ? "Eliminatoria directa"
          : "Liga con playoffs";
  const previewSteps = useMemo(() => {
    if (isGroupCompetition) {
      const groupCount = values.groupStageConfig?.groups.length ?? 0;
      if (groupCount === 0) {
        return [
          `${directParticipantCount} equipos inscritos.`,
          directParticipantCount >= 4 ? "La distribucion por grupos esta pendiente." : "Se requieren al menos 4 equipos para continuar.",
          "Los partidos se configuran despues de guardar los grupos.",
        ];
      }
      return [
        `${groupCount} grupos configurados.`,
        values.regularSeasonFormat === "DOUBLE_ROUND" ? "Cada rival de grupo se enfrenta dos veces." : "Cada rival de grupo se enfrenta una vez.",
        values.finalPhaseEnabled ? `${values.finalPhaseQualifiedTeams} equipos avanzan a la llave.` : "El torneo termina con ganadores por grupo y sin campeon general.",
      ];
    }

    if (!values.finalPhaseEnabled) {
      return ["Se juega temporada regular.", "La tabla define al campeon."];
    }

    if (usesDoubleElimination) {
      return [
        isEliminationCompetition
          ? `Participan los ${directParticipantCount} equipos inscritos.`
          : `Clasifican Top ${values.finalPhaseQualifiedTeams}.`,
        "Se arma llave de doble eliminacion.",
        `${values.finalPhaseGrandFinalReset ? "Hay" : "No hay"} reset en gran final.`,
      ];
    }

    if (usesPlayIn) {
      return [
        isEliminationCompetition
          ? `Participan los ${directParticipantCount} equipos inscritos.`
          : `Clasifican Top ${values.finalPhaseQualifiedTeams}.`,
        `${values.finalPhasePlayInSlots} equipos juegan play-in.`,
        `${values.finalPhaseByes} pasan directo al bracket.`,
      ];
    }

    return [
      isEliminationCompetition
        ? `Participan los ${directParticipantCount} equipos inscritos.`
        : `Clasifican ${values.finalPhaseQualifiedTeams === 2 ? "2 equipos" : `Top ${values.finalPhaseQualifiedTeams}`}.`,
      values.finalPhaseByes > 0 ? `${values.finalPhaseByes} avanzan con bye.` : "Todos empiezan en la primera ronda.",
      getBracketRoundsLabel(values.finalPhaseQualifiedTeams, values.finalPhaseByes),
    ];
  }, [directParticipantCount, isEliminationCompetition, isGroupCompetition, usesDoubleElimination, usesPlayIn, values.finalPhaseByes, values.finalPhaseEnabled, values.finalPhaseGrandFinalReset, values.finalPhasePlayInSlots, values.finalPhaseQualifiedTeams, values.groupStageConfig, values.regularSeasonFormat]);
  const activeCapabilities = [
    capabilities.showStandings ? "Tabla" : null,
    capabilities.showLeagueCalendar ? "Calendario" : null,
    capabilities.showBracket ? "Llave" : null,
    capabilities.showPlayIn ? "Play-In" : null,
    capabilities.showMatches ? "Partidos" : null,
  ].filter((label): label is string => Boolean(label));

  useEffect(() => {
    if (league) {
      if (hydratedLeagueIdRef.current === league.id && formState.isDirty) {
        return;
      }

      reset(toLeagueFormValues(league));
      setRegularSeasonChangeConfirmed(false);
      hydratedLeagueIdRef.current = league.id;
    }
  }, [formState.isDirty, league, reset]);

  const commitPatch = (patch: Partial<LeagueFormValues>) => {
    const nextValues: LeagueFormValues = {
      ...values,
      ...patch,
    };
    const normalizedPatch: Partial<LeagueFormValues> = {
      ...patch,
      finalPhasePreset: resolveFinalPhasePreset(nextValues),
    };

    (Object.entries(normalizedPatch) as Array<[keyof LeagueFormValues, LeagueFormValues[keyof LeagueFormValues]]>).forEach(
      ([fieldName, fieldValue]) => {
        if (fieldValue === undefined) {
          return;
        }

        setFormValue(setValue, fieldName, fieldValue);
      },
    );
  };

  const applyLeagueOnly = () => {
    if (!values.finalPhaseEnabled) {
      return;
    }

    commitPatch({
      finalPhaseEnabled: false,
    });
  };

  const applyLeagueWithFinalPhase = () => {
    if (values.finalPhaseEnabled) {
      return;
    }

    commitPatch({
      finalPhaseEnabled: true,
    });
  };

  const updateGroupStageConfig = (nextConfig: NonNullable<LeagueFormValues["groupStageConfig"]>) => {
    setFormValue(setValue, "groupStageConfig", nextConfig);
  };

  const updateGroupFinalPhase = (enabled: boolean, qualifiedTeams: number) => {
    if (!enabled) {
      commitPatch({
        finalPhaseEnabled: false,
      });
      return;
    }

    const resolvedQualifiedTeams = Math.max(2, qualifiedTeams);
    commitPatch({
      finalPhaseEnabled: true,
      finalPhasePreset: "CUSTOM",
      finalPhaseFormat: "SINGLE_ELIMINATION",
      finalPhaseQualifiedTeams: resolvedQualifiedTeams,
      finalPhaseByes: getRecommendedByes(resolvedQualifiedTeams),
      finalPhasePlayInSlots: 0,
      finalPhaseTwoLegs: false,
      finalPhaseRoundBestOf: 1,
      finalPhaseFinalBestOf: 1,
      finalPhaseGrandFinalReset: false,
    });
  };

  const moveStandingsTiebreaker = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= values.standingsTiebreakers.length) return;
    const next = [...values.standingsTiebreakers];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setFormValue(setValue, "standingsTiebreakers", next);
  };

  const applyClosingFormat = (format: LeagueFinalPhaseFormatOption) => {
    if (!values.finalPhaseEnabled) {
      commitPatch({
        finalPhaseEnabled: true,
      });
    }

    if (format === "SINGLE_ELIMINATION") {
      commitPatch({
        finalPhaseEnabled: true,
        finalPhaseFormat: "SINGLE_ELIMINATION",
        finalPhasePlayInSlots: 0,
        finalPhaseByes: getRecommendedByes(values.finalPhaseQualifiedTeams),
        finalPhaseTwoLegs: false,
        finalPhaseGrandFinalReset: false,
      });
      return;
    }

    if (format === "PLAY_IN_PLUS_BRACKET") {
      const nextPlayInSlots = resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots > 0 ? values.finalPhasePlayInSlots : 4, values.finalPhaseQualifiedTeams);
      if (nextPlayInSlots === 0) {
        return;
      }
      commitPatch({
        finalPhaseEnabled: true,
        finalPhaseFormat: "PLAY_IN_PLUS_BRACKET",
        finalPhasePlayInSlots: nextPlayInSlots,
        finalPhaseByes: Math.max(0, values.finalPhaseQualifiedTeams - nextPlayInSlots),
        finalPhaseTwoLegs: false,
        finalPhaseGrandFinalReset: false,
      });
      return;
    }

    if (!isPowerOfTwo(values.finalPhaseQualifiedTeams)) {
      return;
    }

    commitPatch({
      finalPhaseEnabled: true,
      finalPhaseFormat: "DOUBLE_ELIMINATION",
      finalPhaseByes: 0,
      finalPhasePlayInSlots: 0,
      finalPhaseTwoLegs: false,
      finalPhaseRoundBestOf: 1,
      finalPhaseFinalBestOf: 3,
      finalPhaseGrandFinalReset: true,
      finalPhaseSeededHomeAdvantage: false,
    });
  };

  const applyQualifiedTeams = (teamCount: number) => {
    if (usesDoubleElimination && !isPowerOfTwo(teamCount)) {
      return;
    }

    if (usesPlayIn && teamCount <= 2) {
      return;
    }

    if (usesDoubleElimination) {
      commitPatch({
        finalPhaseQualifiedTeams: teamCount,
        finalPhaseByes: 0,
        finalPhasePlayInSlots: 0,
      });
      return;
    }

    if (usesPlayIn) {
      const nextPlayInSlots = resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots > 0 ? values.finalPhasePlayInSlots : 4, teamCount);
      commitPatch({
        finalPhaseQualifiedTeams: teamCount,
        finalPhasePlayInSlots: nextPlayInSlots,
        finalPhaseByes: Math.max(0, teamCount - nextPlayInSlots),
      });
      return;
    }

    commitPatch({
      finalPhaseQualifiedTeams: teamCount,
      finalPhaseByes: getRecommendedByes(teamCount),
      finalPhasePlayInSlots: 0,
    });
  };

  const applyPlayInSlots = (slotCount: number) => {
    const nextPlayInSlots = resolvePlayInSlotsForTeamCount(slotCount, values.finalPhaseQualifiedTeams);
    commitPatch({
      finalPhasePlayInSlots: nextPlayInSlots,
      finalPhaseByes: Math.max(0, values.finalPhaseQualifiedTeams - nextPlayInSlots),
    });
  };

  const applyEliminationMode = (mode: EliminationMode) => {
    if (mode === "SINGLE_GAME") {
      commitPatch({
        finalPhaseTwoLegs: false,
        finalPhaseRoundBestOf: 1,
        finalPhaseFinalBestOf: 1,
      });
      return;
    }

    commitPatch({
      finalPhaseTwoLegs: false,
      finalPhaseRoundBestOf: 3,
      finalPhaseFinalBestOf: 3,
    });
  };

  const applyBestOf = (bestOf: number) => {
    commitPatch({
      finalPhaseTwoLegs: false,
      finalPhaseRoundBestOf: bestOf,
      finalPhaseFinalBestOf: bestOf,
    });
  };

  const applyFinalBestOf = (bestOf: number) => {
    commitPatch({
      finalPhaseFinalBestOf: bestOf,
    });
  };

  const toggleBooleanRule = (
    fieldName: keyof Pick<
      LeagueFormValues,
      "finalPhaseThirdPlaceMatch" | "finalPhaseSeededHomeAdvantage" | "finalPhaseReseedEachRound" | "finalPhaseGrandFinalReset"
    >,
  ) => {
    if (fieldName === "finalPhaseGrandFinalReset" && !usesDoubleElimination) {
      return;
    }

    commitPatch({
      [fieldName]: !values[fieldName],
    } as Partial<LeagueFormValues>);
  };

  const submitAdvancedSettings = async (nextValues: LeagueFormValues) => {
    if (!league) {
      return;
    }

    await saveLeague({
      mode: "edit",
      leagueId: league.id,
      values: {
        ...nextValues,
        finalPhaseTwoLegs: false,
        finalPhasePreset: resolveFinalPhasePreset({ ...nextValues, finalPhaseTwoLegs: false }),
      },
      options: {
        confirmRegularSeasonFormatChange: regularSeasonFormatChanged && regularSeasonChangeConfirmed,
      },
    });

    clearMutationError();
    navigate(league.competitionType === "GROUPS" ? `/leagues/${league.id}` : `/leagues/${league.id}/settings`);
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1260px]">
        <PageHeader
          title="Configurar modo de juego"
          subtitle="Completa equipos, recorrido y cierre desde una vista dedicada."
          actions={<LeagueSectionNav league={league} />}
        />

        <Panel>
          {mutationErrorMessage ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {mutationErrorMessage}
            </div>
          ) : null}

          {!loading && !hasValidLeagueId ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="El enlace de esta liga es invalido o ya no esta disponible."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {!loading && hasValidLeagueId && !league ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="No encontramos la liga que intentaste abrir."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {league ? (
            <form className="space-y-5" onSubmit={handleSubmit(submitAdvancedSettings)}>
              <section className="rounded-[28px] border border-sky-100 bg-[radial-gradient(circle_at_top_left,rgba(224,242,254,0.92),transparent_36%),linear-gradient(135deg,#fbfdff_0%,#ffffff_62%,#fff8f1_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                      <SlidersHorizontal size={13} />
                      {league.name}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {compactSummaryItems.map((item) => (
                        <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                          {item}
                        </span>
                      ))}
                      {hiddenSummaryCount > 0 ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">
                          +{hiddenSummaryCount}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={cn(
                      "rounded-[20px] border px-4 py-3 text-sm shadow-sm",
                      finalPhaseError ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {finalPhaseError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                      <p>{finalPhaseError ?? "Configuracion compatible con las vistas actuales."}</p>
                    </div>
                  </div>
                </div>
              </section>

              {league.bracketGenerated ? (
                <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                  <p className="font-bold">{isEliminationCompetition ? "La llave ya esta cerrada." : "La fase regular ya esta cerrada."}</p>
                  <p className="mt-1 leading-6">
                    {isEliminationCompetition
                      ? "Los participantes y la estructura quedaron congelados al pulsar Listo. Reinicia la llave si necesitas armarlos de nuevo."
                      : "La tabla, los equipos y las reglas de clasificacion quedaron congelados al generar la llave. Reinicia la llave desde Llaves si necesitas modificarlos."}
                  </p>
                </div>
              ) : null}

              <fieldset disabled={league.bracketGenerated || (isGroupCompetition && league.matchesCount > 0)} className="grid gap-5 disabled:opacity-75 xl:grid-cols-[minmax(0,1fr)_310px]">
                <div className="space-y-5">
                  {isGroupCompetition ? (
                    canConfigureGroupStage && values.groupStageConfig ? (
                      <LeagueGroupStageEditor
                        config={values.groupStageConfig}
                        teams={registeredGroupTeams}
                        finalPhaseEnabled={values.finalPhaseEnabled}
                        regularSeasonFormat={values.regularSeasonFormat}
                        locked={league.matchesCount > 0}
                        showDistribution={false}
                        error={formState.errors.groupStageConfig?.message}
                        onChange={updateGroupStageConfig}
                        onRegularSeasonFormatChange={(format) => {
                          setRegularSeasonChangeConfirmed(false);
                          setFormValue(setValue, "regularSeasonFormat", format);
                        }}
                        onFinalPhaseChange={updateGroupFinalPhase}
                      />
                    ) : (
                      <SectionCard title="Primero deja listos los grupos" description="La distribucion inicial se realiza una sola vez desde el apartado Grupos del dashboard.">
                        <div className="flex flex-col gap-4 rounded-[20px] border border-amber-200 bg-amber-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-start gap-3">
                            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-amber-700 shadow-sm"><UsersRound size={18} /></span>
                            <div>
                              <p className="text-sm font-bold text-slate-950">Configuracion de grupos pendiente</p>
                              <p className="mt-1 text-xs leading-5 text-slate-600">Crea y confirma los grupos antes de ajustar vueltas, clasificados o cierre eliminatorio.</p>
                            </div>
                          </div>
                          <Button type="button" variant="outline" onClick={() => navigate(`/leagues/${league.id}/groups`)} className="border-amber-300 bg-white text-amber-800 hover:bg-amber-100">
                            Abrir grupos
                          </Button>
                        </div>
                      </SectionCard>
                    )
                  ) : (
                    <SectionCard title="Equipos participantes" description="Primero define quienes formaran parte de esta competencia.">
                      <div className="flex flex-col gap-3 rounded-[20px] border border-sky-100 bg-sky-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sky-700"><UsersRound size={17} /></span>
                          <div>
                            <p className="text-sm font-bold text-slate-950">{directParticipantCount} equipos inscritos</p>
                            <p className="mt-0.5 text-xs text-slate-500">Puedes volver aqui despues de actualizar la plantilla.</p>
                          </div>
                        </div>
                        <Button type="button" variant="outline" onClick={() => navigate(`/leagues/${league.id}/teams/manage`)}>
                          Administrar equipos
                        </Button>
                      </div>
                    </SectionCard>
                  )}

                  {values.competitionType === "LEAGUE" ? (
                    <SectionCard title="Temporada regular" description="Define cuantas veces se enfrenta cada pareja de equipos. Los partidos se crean manualmente.">
                      <div className="grid gap-3 md:grid-cols-2">
                        <ChoiceCard
                          active={values.regularSeasonFormat === "SINGLE_ROUND"}
                          title="Una vuelta"
                          description="Cada equipo enfrenta una vez a cada rival."
                          onClick={() => {
                            setRegularSeasonChangeConfirmed(false);
                            setFormValue(setValue, "regularSeasonFormat", "SINGLE_ROUND");
                          }}
                        />
                        <ChoiceCard
                          active={values.regularSeasonFormat === "DOUBLE_ROUND"}
                          title="Ida y vuelta"
                          description="Cada pareja se enfrenta dos veces, una por vuelta."
                          onClick={() => {
                            setRegularSeasonChangeConfirmed(false);
                            setFormValue(setValue, "regularSeasonFormat", "DOUBLE_ROUND");
                          }}
                        />
                      </div>
                      {regularSeasonFormatChanged ? (
                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <input
                            type="checkbox"
                            checked={regularSeasonChangeConfirmed}
                            onChange={(event) => setRegularSeasonChangeConfirmed(event.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-amber-300 text-orange-600"
                          />
                          <span><strong>Confirmar cambio.</strong> Ya existen partidos; cambiar las vueltas no los duplicara ni los eliminara automaticamente.</span>
                        </label>
                      ) : null}
                    </SectionCard>
                  ) : null}

                  {values.competitionType === "LEAGUE" || (values.competitionType === "GROUPS" && canConfigureGroupStage) ? (
                    <SectionCard title="Orden de desempate" description={`Las victorias siempre mandan. Ordena los criterios para ${values.competitionType === "GROUPS" ? "cada tabla de grupo" : "la tabla general"}.`}>
                      <div className="space-y-2.5">
                        {values.standingsTiebreakers.map((criterion, index) => {
                          const label = standingsTiebreakerLabels[criterion];
                          return (
                            <div key={criterion} className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-3">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-black text-orange-600 shadow-sm">{index + 1}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-950">{label.title}</p>
                                <p className="mt-0.5 text-xs text-slate-500">{label.description}</p>
                              </div>
                              <div className="flex shrink-0 gap-1">
                                <button type="button" aria-label={`Subir ${label.title}`} disabled={index === 0} onClick={() => moveStandingsTiebreaker(index, -1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-30"><ArrowUp size={14} /></button>
                                <button type="button" aria-label={`Bajar ${label.title}`} disabled={index === values.standingsTiebreakers.length - 1} onClick={() => moveStandingsTiebreaker(index, 1)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-orange-200 hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-30"><ArrowDown size={14} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.competitionType === "LEAGUE" ? (
                    <SectionCard title="Cambiar estructura" description="Solo usa esta opcion si deseas agregar una fase final a la liga.">
                      <div className="grid gap-3 md:grid-cols-2">
                        <ChoiceCard
                          active={!values.finalPhaseEnabled}
                          title="Solo liga"
                          description="Tabla y calendario sin fase final."
                          onClick={applyLeagueOnly}
                        />
                        <ChoiceCard
                          active={values.finalPhaseEnabled}
                          title="Liga con cierre"
                          description="La tabla clasifica y luego se juega una fase final."
                          onClick={applyLeagueWithFinalPhase}
                        />
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.finalPhaseEnabled ? (
                    <SectionCard
                      title={isEliminationCompetition ? "Tipo de eliminatoria" : "Formato"}
                      description={isEliminationCompetition ? "Todos los participantes comienzan en cruces directos." : "Elige solo un camino. El editor oculta el resto para evitar ruido."}
                    >
                      <div className={isEliminationCompetition ? "grid gap-3" : "grid gap-3 xl:grid-cols-3"}>
                        <ChoiceCard
                          active={isEliminationCompetition || values.finalPhaseFormat === "SINGLE_ELIMINATION"}
                          title={isEliminationCompetition ? "Eliminatoria directa" : "Playoffs clasicos"}
                          description={
                            isEliminationCompetition
                              ? "Cruces directos desde la primera ronda."
                              : "Llave simple para la mayoria de torneos."
                          }
                          onClick={() => applyClosingFormat("SINGLE_ELIMINATION")}
                        />
                        {!isEliminationCompetition ? (
                          <>
                            <ChoiceCard
                              active={values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET"}
                              title="Play-In"
                              description={playInAvailable ? "Primero repechaje y luego bracket final." : "La cantidad actual no permite cerrar una llave valida despues del repechaje."}
                              disabled={!playInAvailable}
                              onClick={() => applyClosingFormat("PLAY_IN_PLUS_BRACKET")}
                            />
                            <ChoiceCard
                              active={values.finalPhaseFormat === "DOUBLE_ELIMINATION"}
                              title="Doble eliminacion"
                              description={doubleEliminationAvailable ? "Dos derrotas para quedar fuera." : "Requiere 2, 4, 8, 16 o 32 participantes."}
                              disabled={!doubleEliminationAvailable}
                              onClick={() => applyClosingFormat("DOUBLE_ELIMINATION")}
                            />
                          </>
                        ) : null}
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.finalPhaseEnabled && isEliminationCompetition ? (
                    <SectionCard title="Participantes" description="En eliminacion directa no existe un corte de clasificados.">
                      <div className="rounded-[20px] border border-sky-200 bg-sky-50/70 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-950">
                          Los {directParticipantCount} equipos inscritos entran a la llave.
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {directParticipantCount < 2
                            ? "Agrega al menos 2 equipos antes de generar los cruces."
                            : (directParticipantCount & (directParticipantCount - 1)) !== 0
                              ? "Ajusta los participantes a 2, 4, 8, 16 o 32 equipos."
                              : "Todos comienzan en la misma ronda y ninguno recibe pase automatico."}
                        </p>
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.finalPhaseEnabled && !isEliminationCompetition && !isGroupCompetition ? (
                    <SectionCard title="Clasificados" description="Solo se muestran cantidades utiles para el formato actual.">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {(usesDoubleElimination ? [2, 4, 8, 16, 32] : usesPlayIn ? [6, 8, 10, 12, 16] : [2, 4, 6, 8, 16, 32])
                          .filter((teamCount) => directParticipantCount === 0 || teamCount <= directParticipantCount)
                          .map((teamCount) => (
                          <OptionButton
                            key={teamCount}
                            active={selectedQualifiedTeams === teamCount}
                            onClick={() => applyQualifiedTeams(teamCount)}
                          >
                            <span className="block">{teamCount === 2 ? "Final directa" : `Top ${teamCount}`}</span>
                          </OptionButton>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
                        <Controller
                          name="finalPhaseQualifiedTeams"
                          control={control}
                          render={({ field, fieldState }) => (
                            <Select
                              label="Otro compatible"
                              value={String(field.value)}
                              onChange={(event) => applyQualifiedTeams(Number(event.target.value))}
                              onBlur={field.onBlur}
                              error={fieldState.error?.message}
                            >
                              {leagueFinalPhaseQualifiedTeamsOptions
                                .filter((teamCount) => directParticipantCount === 0 || teamCount <= directParticipantCount)
                                .filter((teamCount) => !usesDoubleElimination || isPowerOfTwo(teamCount))
                                .filter((teamCount) => !usesPlayIn || resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots || 4, teamCount) > 0)
                                .map((teamCount) => (
                                  <option key={teamCount} value={teamCount}>
                                    {teamCount === 2 ? "Final directa" : `Top ${teamCount}`}
                                  </option>
                                ))}
                            </Select>
                          )}
                        />

                        <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          {usesDoubleElimination
                            ? `La llave se jugara con Top ${values.finalPhaseQualifiedTeams}.`
                            : usesPlayIn
                              ? `${values.finalPhasePlayInSlots} equipos juegan play-in y ${values.finalPhaseByes} pasan directo al bracket.`
                              : values.finalPhaseByes > 0
                                ? `${values.finalPhaseByes} equipos avanzan con bye.`
                                : "Todos arrancan desde la misma ronda."}
                        </div>
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.finalPhaseEnabled && values.competitionType === "LEAGUE" ? (
                    <SectionCard title="Acomodo de la llave" description="El Top configurado siempre clasifica. Aqui decides solamente como se ordenan sus cruces.">
                      <div className="grid gap-3 md:grid-cols-3">
                        <ChoiceCard
                          active={values.finalPhaseSeedMode === "STANDINGS"}
                          title="Mejor contra peor"
                          description="Cruza 1 vs ultimo, 2 vs penultimo y continua por tabla."
                          onClick={() => setFormValue(setValue, "finalPhaseSeedMode", "STANDINGS")}
                        />
                        <ChoiceCard
                          active={values.finalPhaseSeedMode === "RANDOM"}
                          title="Sorteo"
                          description="Mezcla las posiciones, pero solo entre los equipos del Top."
                          onClick={() => setFormValue(setValue, "finalPhaseSeedMode", "RANDOM")}
                        />
                        <ChoiceCard
                          active={values.finalPhaseSeedMode === "MANUAL"}
                          title="Orden manual"
                          description="Acomoda manualmente a los clasificados antes de crear la llave."
                          onClick={() => setFormValue(setValue, "finalPhaseSeedMode", "MANUAL")}
                        />
                      </div>
                    </SectionCard>
                  ) : null}

                  {usesPlayIn ? (
                    <SectionCard
                      title="Play-In"
                      description={isEliminationCompetition
                        ? "Solo aparecen los cupos compatibles con la cantidad de participantes inscritos."
                        : "Solo aparecen los cupos que tienen sentido para esta cantidad de clasificados."}
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[2, 4, 6]
                          .filter((slotCount) => slotCount < values.finalPhaseQualifiedTeams)
                          .filter((slotCount) => resolvePlayInSlotsForTeamCount(slotCount, values.finalPhaseQualifiedTeams) === slotCount)
                          .map((slotCount) => (
                            <OptionButton
                              key={slotCount}
                              active={values.finalPhasePlayInSlots === slotCount}
                              onClick={() => applyPlayInSlots(slotCount)}
                            >
                              <span className="block">{slotCount} cupos</span>
                              <span className="mt-1 block text-xs font-medium text-slate-500">
                                {Math.max(0, values.finalPhaseQualifiedTeams - slotCount)} directos
                              </span>
                            </OptionButton>
                          ))}
                      </div>

                      <div className="mt-4">
                        <Controller
                          name="finalPhasePlayInSlots"
                          control={control}
                          render={({ field, fieldState }) => (
                            <Select
                              label="Otro cupo compatible"
                              value={String(field.value)}
                              onChange={(event) => applyPlayInSlots(Number(event.target.value))}
                              onBlur={field.onBlur}
                              error={fieldState.error?.message}
                            >
                              {Array.from({ length: Math.max(0, values.finalPhaseQualifiedTeams - 1) }, (_, index) => index + 1)
                                .filter((slotCount) => slotCount % 2 === 0 && slotCount < values.finalPhaseQualifiedTeams)
                                .filter((slotCount) => resolvePlayInSlotsForTeamCount(slotCount, values.finalPhaseQualifiedTeams) === slotCount)
                                .map((slotCount) => (
                                  <option key={slotCount} value={slotCount}>
                                    {slotCount} cupos
                                  </option>
                                ))}
                            </Select>
                          )}
                        />
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.finalPhaseEnabled && !usesDoubleElimination ? (
                    <SectionCard title="Series" description="Se muestran solo las formas de cruce compatibles con el formato actual.">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <OptionButton active={eliminationMode === "SINGLE_GAME"} onClick={() => applyEliminationMode("SINGLE_GAME")}>
                          Partido unico
                        </OptionButton>
                        <OptionButton active={eliminationMode === "BEST_OF"} onClick={() => applyEliminationMode("BEST_OF")}>
                          Mejor de
                        </OptionButton>
                      </div>

                      {eliminationMode === "BEST_OF" ? (
                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                          {[3, 5, 7].map((bestOf) => (
                            <OptionButton
                              key={bestOf}
                              active={values.finalPhaseRoundBestOf === bestOf && values.finalPhaseFinalBestOf === bestOf}
                              onClick={() => applyBestOf(bestOf)}
                            >
                              Mejor de {bestOf}
                            </OptionButton>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-4 max-w-[220px]">
                          <Controller
                            name="finalPhaseFinalBestOf"
                            control={control}
                            render={({ field, fieldState }) => (
                              <Select
                                label="Final"
                                value={String(field.value)}
                                onChange={(event) => applyFinalBestOf(Number(event.target.value))}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                              >
                                {leagueFinalPhaseBestOfOptions.map((bestOf) => (
                                  <option key={bestOf} value={bestOf}>
                                    {bestOf === 1 ? "Partido unico" : `Mejor de ${bestOf}`}
                                  </option>
                                ))}
                              </Select>
                            )}
                          />
                      </div>
                    </SectionCard>
                  ) : null}

                  {usesDoubleElimination ? (
                    <SectionCard title="Gran final" description="En doble eliminacion solo dejamos visibles los ajustes que realmente aplican.">
                      <div className="grid gap-2 sm:grid-cols-4">
                        {[1, 3, 5, 7].map((bestOf) => (
                          <OptionButton
                            key={bestOf}
                            active={values.finalPhaseFinalBestOf === bestOf}
                            onClick={() => applyFinalBestOf(bestOf)}
                          >
                            {bestOf === 1 ? "1 juego" : `Mejor de ${bestOf}`}
                          </OptionButton>
                        ))}
                      </div>

                      <div className="mt-4">
                        <OptionButton active={values.finalPhaseGrandFinalReset} onClick={() => toggleBooleanRule("finalPhaseGrandFinalReset")}>
                          Reset en gran final
                        </OptionButton>
                      </div>
                    </SectionCard>
                  ) : null}

                  {values.finalPhaseEnabled ? (
                    <SectionCard
                      title="Extras"
                      description={isEliminationCompetition
                        ? "Opcionalmente puedes disputar el tercer lugar entre quienes pierdan las semifinales."
                        : "Reglas opcionales para definir localia y el acomodo de las siguientes rondas."}
                    >
                      <div className={`grid gap-2 ${isEliminationCompetition ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
                        {!usesDoubleElimination ? (
                          <OptionButton
                            active={values.finalPhaseThirdPlaceMatch}
                            disabled={!thirdPlaceAvailable}
                            title={thirdPlaceAvailable ? undefined : "Se requieren al menos cuatro equipos en la llave principal."}
                            onClick={() => toggleBooleanRule("finalPhaseThirdPlaceMatch")}
                          >
                            Tercer lugar
                          </OptionButton>
                        ) : null}
                        {!isEliminationCompetition ? (
                          <OptionButton active={values.finalPhaseSeededHomeAdvantage} onClick={() => toggleBooleanRule("finalPhaseSeededHomeAdvantage")}>
                            Mejor sembrado local
                          </OptionButton>
                        ) : null}
                        {!isEliminationCompetition && !usesDoubleElimination ? (
                          <OptionButton active={values.finalPhaseReseedEachRound} onClick={() => toggleBooleanRule("finalPhaseReseedEachRound")}>
                            Resiembra
                          </OptionButton>
                        ) : null}
                      </div>
                    </SectionCard>
                  ) : null}
                </div>

                <aside className="space-y-5 xl:sticky xl:top-5 xl:self-start">
                  <section className="rounded-[26px] border border-slate-300 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                        <Trophy size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">Vista previa</p>
                        <h2 className="mt-1 text-lg font-semibold text-slate-950">{previewLabel}</h2>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {activeCapabilities.map((label) => (
                        <CapabilityPill key={label} label={label} />
                      ))}
                    </div>

                    <div className="mt-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-orange-600" />
                        <p className="text-sm font-semibold text-slate-900">Recorrido</p>
                      </div>

                      <div className="mt-4 space-y-3">
                        {previewSteps.map((step, index) => (
                          <div key={`${step}-${index}`} className="flex items-start gap-3">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm">
                              {index + 1}
                            </span>
                            <p className="text-sm leading-6 text-slate-600">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </aside>
              </fieldset>

              <FormErrors message={mutationError instanceof Error ? mutationError.message : null} />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100"
                >
                  <ArrowLeft size={15} />
                  Volver
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={league.bracketGenerated || (isGroupCompetition && league.matchesCount > 0) || submitting || !formState.isValid || (isGroupCompetition && !canConfigureGroupStage) || (regularSeasonFormatChanged && !regularSeasonChangeConfirmed)}
                >
                  <Save size={15} />
                  {submitting ? "Guardando..." : "Guardar reglas"}
                </Button>
              </div>
            </form>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
