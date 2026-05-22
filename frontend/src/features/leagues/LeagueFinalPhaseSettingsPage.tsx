import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Controller, useForm, type Resolver, type UseFormSetValue } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import {
  type CompetitionStructure,
  inferCompetitionStructure,
} from "@/features/leagues/competitionCapabilities";
import {
  applyPresetDefaults,
  leagueFinalPhaseFormatLabels,
} from "@/features/leagues/finalPhaseConfig";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import {
  leagueFinalPhaseBestOfOptions,
  leagueFinalPhaseQualifiedTeamsOptions,
  type LeagueFormValues,
} from "@/features/leagues/Leagues.types";
import { leagueFormSchema, toLeagueFormValues } from "@/features/leagues/schemas/Leagues.schema";
import { useQuery } from "@tanstack/react-query";
import { FormErrors } from "@/features/leagues/components/FormErrors";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, Input, PageHeader, Panel, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

const optionButtonClass =
  "rounded-[16px] border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";

type TournamentFormatSelection = CompetitionStructure;

type SeriesSelection = "SINGLE_GAME" | "HOME_AWAY" | "BEST_OF_3" | "BEST_OF_5" | "BEST_OF_7";

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
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : "border-slate-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50/70 hover:text-orange-700",
      )}
    >
      {children}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
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
    return "Semifinales + Final";
  }

  if (qualifiedTeams === 6 && byes === 2) {
    return "Cuartos parciales + Semifinales + Final";
  }

  if (qualifiedTeams === 8 && byes === 0) {
    return "Cuartos + Semifinales + Final";
  }

  if (qualifiedTeams === 16 && byes === 0) {
    return "Octavos + Cuartos + Semifinales + Final";
  }

  return byes > 0 ? `Bracket de ${qualifiedTeams} con ${byes} byes` : `Bracket de ${qualifiedTeams}`;
}

function resolvePlayInSlotsForTeamCount(currentSlots: number, qualifiedTeams: number) {
  const maxAllowedSlots = Math.max(0, qualifiedTeams - 1);
  const maxEvenSlots = maxAllowedSlots % 2 === 0 ? maxAllowedSlots : maxAllowedSlots - 1;

  if (maxEvenSlots < 2) {
    return 0;
  }

  const boundedSlots = Math.min(Math.max(currentSlots, 2), maxEvenSlots);
  return boundedSlots % 2 === 0 ? boundedSlots : Math.max(2, boundedSlots - 1);
}

export default function LeagueFinalPhaseSettingsPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;
  const [selectedTournamentFormat, setSelectedTournamentFormat] = useState<TournamentFormatSelection>("LEAGUE_PLAYOFFS");
  const [selectedQualifiedTeams, setSelectedQualifiedTeams] = useState<number | "CUSTOM">(8);
  const [selectedByes, setSelectedByes] = useState<number | "CUSTOM">(0);
  const [selectedPlayInSlots, setSelectedPlayInSlots] = useState<number | "CUSTOM">(0);
  const [selectedSeries, setSelectedSeries] = useState<SeriesSelection>("SINGLE_GAME");

  const leagueQuery = useQuery({
    queryKey: leaguesQueryKeys.detail(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeague(selectedLeagueId, signal),
    enabled: hasValidLeagueId,
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
  const hydratedLeagueIdRef = useRef<number | null>(null);
  const isEliminationCompetition = league?.competitionType === "ELIMINATION";
  const isLeagueOnly = selectedTournamentFormat === "LEAGUE_ONLY" || !values.finalPhaseEnabled;
  const usesPlayoffs = !isLeagueOnly;
  const usesPlayIn =
    usesPlayoffs &&
    (selectedTournamentFormat === "PLAY_IN_PLUS_BRACKET" ||
      values.finalPhaseFormat === "PLAY_IN_PLUS_BRACKET" ||
      values.finalPhasePlayInSlots > 0);
  const usesDoubleElimination =
    usesPlayoffs &&
    (selectedTournamentFormat === "DOUBLE_ELIMINATION" || values.finalPhaseFormat === "DOUBLE_ELIMINATION");
  const hasClassicBracket = usesPlayoffs;
  const recommendedByes = getRecommendedByes(values.finalPhaseQualifiedTeams);
  const supportsByes = hasClassicBracket && !usesPlayIn && !usesDoubleElimination && recommendedByes > 0;
  const showClassification = usesPlayoffs;
  const showByesPlayIn = supportsByes || usesPlayIn;
  const showSeries = hasClassicBracket;
  const showRoundConfig = hasClassicBracket && (selectedSeries !== "SINGLE_GAME" || values.finalPhaseRoundBestOf > 1 || values.finalPhaseTwoLegs);
  const showExtraRules = hasClassicBracket;
  const inferredTournamentFormat = useMemo(
    () =>
      inferCompetitionStructure({
        competitionType: values.competitionType,
        finalPhaseEnabled: values.finalPhaseEnabled,
        finalPhaseFormat: values.finalPhaseFormat,
        finalPhasePreset: values.finalPhasePreset,
      }),
    [values.competitionType, values.finalPhaseEnabled, values.finalPhaseFormat, values.finalPhasePreset],
  );

  useEffect(() => {
    if (league) {
      if (hydratedLeagueIdRef.current === league.id && formState.isDirty) {
        return;
      }

      const nextValues = toLeagueFormValues(league);
      reset(nextValues);
      setSelectedQualifiedTeams([2, 4, 6, 8, 10, 12, 14, 16, 24, 32].includes(nextValues.finalPhaseQualifiedTeams) ? nextValues.finalPhaseQualifiedTeams : "CUSTOM");
      setSelectedByes([0, 2, 4].includes(nextValues.finalPhaseByes) ? nextValues.finalPhaseByes : "CUSTOM");
      setSelectedPlayInSlots([0, 2, 4].includes(nextValues.finalPhasePlayInSlots) ? nextValues.finalPhasePlayInSlots : "CUSTOM");
      setSelectedSeries(
        nextValues.finalPhaseTwoLegs
          ? "HOME_AWAY"
          : nextValues.finalPhaseRoundBestOf === 3
            ? "BEST_OF_3"
            : nextValues.finalPhaseRoundBestOf === 5
              ? "BEST_OF_5"
              : nextValues.finalPhaseRoundBestOf === 7
                ? "BEST_OF_7"
                : "SINGLE_GAME",
      );
      setSelectedTournamentFormat(
        inferCompetitionStructure(nextValues),
      );
      hydratedLeagueIdRef.current = league.id;
    }
  }, [formState.isDirty, league, reset]);

  useEffect(() => {
    if (selectedTournamentFormat !== inferredTournamentFormat) {
      setSelectedTournamentFormat(inferredTournamentFormat);
    }
  }, [inferredTournamentFormat, selectedTournamentFormat]);

  useEffect(() => {
    const nextSeries = values.finalPhaseTwoLegs
      ? "HOME_AWAY"
      : values.finalPhaseRoundBestOf === 3
        ? "BEST_OF_3"
        : values.finalPhaseRoundBestOf === 5
          ? "BEST_OF_5"
          : values.finalPhaseRoundBestOf === 7
            ? "BEST_OF_7"
            : "SINGLE_GAME";

    if (selectedSeries !== nextSeries) {
      setSelectedSeries(nextSeries);
    }
  }, [selectedSeries, values.finalPhaseRoundBestOf, values.finalPhaseTwoLegs]);

  const summaryItems = useMemo(() => {
    if (!values.finalPhaseEnabled) {
      return ["Solo liga"];
    }

    const chips = [
      leagueFinalPhaseFormatLabels[values.finalPhaseFormat],
      `Top ${values.finalPhaseQualifiedTeams}`,
      values.finalPhaseTwoLegs ? "Ida y vuelta" : "Partido unico",
      values.finalPhaseRoundBestOf === 1 ? "Rondas 1 juego" : `Rondas mejor de ${values.finalPhaseRoundBestOf}`,
      values.finalPhaseFinalBestOf === 1 ? "Final 1 juego" : `Final mejor de ${values.finalPhaseFinalBestOf}`,
    ];

    if (values.finalPhaseFormat === "SINGLE_ELIMINATION") {
      chips.push(getBracketRoundsLabel(values.finalPhaseQualifiedTeams, values.finalPhaseByes));
    }
    if (values.finalPhaseByes > 0) chips.push(`${values.finalPhaseByes} byes`);
    if (values.finalPhasePlayInSlots > 0) chips.push(`${values.finalPhasePlayInSlots} cupos play-in`);
    if (values.finalPhaseThirdPlaceMatch) chips.push("Tercer lugar");
    if (values.finalPhaseSeededHomeAdvantage) chips.push("Localia por sembrado");
    if (values.finalPhaseReseedEachRound) chips.push("Resiembra");
    if (values.finalPhaseGrandFinalReset) chips.push("Reset en gran final");

    return chips;
  }, [values]);

  const applyTournamentFormat = (format: TournamentFormatSelection) => {
    if (isEliminationCompetition && format === "LEAGUE_ONLY") {
      return;
    }

    setSelectedTournamentFormat(format);

    if (format === "LEAGUE_ONLY") {
      setFormValue(setValue, "finalPhaseEnabled", false);
      applyPresetDefaults(setValue, "TOP_8_SINGLE_GAME");
      setSelectedQualifiedTeams(8);
      setSelectedByes(0);
      setSelectedPlayInSlots(0);
      setSelectedSeries("SINGLE_GAME");
      return;
    }

    setFormValue(setValue, "finalPhaseEnabled", true);

    if (format === "LEAGUE_PLAYOFFS") {
      applyPresetDefaults(setValue, "TOP_8_SINGLE_GAME");
      setSelectedQualifiedTeams(8);
      setSelectedByes(0);
      setSelectedPlayInSlots(0);
      setSelectedSeries("SINGLE_GAME");
      return;
    }

    setFormValue(setValue, "finalPhasePreset", "CUSTOM");

    if (format === "DOUBLE_ELIMINATION") {
      setFormValue(setValue, "finalPhaseFormat", "DOUBLE_ELIMINATION");
      setFormValue(setValue, "finalPhaseQualifiedTeams", isPowerOfTwo(values.finalPhaseQualifiedTeams) ? values.finalPhaseQualifiedTeams : 8);
      setFormValue(setValue, "finalPhaseTwoLegs", false);
      setFormValue(setValue, "finalPhaseGrandFinalReset", true);
      setFormValue(setValue, "finalPhasePlayInSlots", 0);
      setFormValue(setValue, "finalPhaseByes", 0);
      setFormValue(setValue, "finalPhaseRoundBestOf", 1);
      setFormValue(setValue, "finalPhaseFinalBestOf", 3);
      setSelectedByes(0);
      setSelectedPlayInSlots(0);
      setSelectedSeries("SINGLE_GAME");
      setSelectedQualifiedTeams(isPowerOfTwo(values.finalPhaseQualifiedTeams) ? values.finalPhaseQualifiedTeams : 8);
      return;
    }

    if (format === "PLAY_IN_PLUS_BRACKET") {
      const nextPlayInSlots = resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots, values.finalPhaseQualifiedTeams);
      const nextByes = Math.max(0, values.finalPhaseQualifiedTeams - nextPlayInSlots);
      setFormValue(setValue, "finalPhaseFormat", "PLAY_IN_PLUS_BRACKET");
      setFormValue(setValue, "finalPhasePlayInSlots", nextPlayInSlots);
      setFormValue(setValue, "finalPhaseByes", nextByes);
      setFormValue(setValue, "finalPhaseGrandFinalReset", false);
      setFormValue(setValue, "finalPhaseTwoLegs", false);
      setSelectedPlayInSlots([0, 2, 4].includes(nextPlayInSlots) ? nextPlayInSlots : "CUSTOM");
      setSelectedByes([0, 2, 4].includes(nextByes) ? nextByes : "CUSTOM");
      setSelectedSeries("SINGLE_GAME");

      if (nextPlayInSlots === 0) {
        const nextRecommendedByes = getRecommendedByes(values.finalPhaseQualifiedTeams);
        setSelectedTournamentFormat("SINGLE_ELIMINATION");
        setFormValue(setValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
        setFormValue(setValue, "finalPhaseByes", nextRecommendedByes);
        setSelectedByes([0, 2, 4].includes(nextRecommendedByes) ? nextRecommendedByes : "CUSTOM");
      }
      return;
    }

    const nextRecommendedByes = getRecommendedByes(values.finalPhaseQualifiedTeams);
    setFormValue(setValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
    setFormValue(setValue, "finalPhasePlayInSlots", 0);
    setFormValue(setValue, "finalPhaseByes", nextRecommendedByes);
    setFormValue(setValue, "finalPhaseGrandFinalReset", false);
    setSelectedPlayInSlots(0);
    setSelectedByes([0, 2, 4].includes(nextRecommendedByes) ? nextRecommendedByes : "CUSTOM");
  };

  const submitAdvancedSettings = async (nextValues: LeagueFormValues) => {
    if (!league) {
      return;
    }

    await saveLeague({
      mode: "edit",
      leagueId: league.id,
      values: nextValues,
    });

    clearMutationError();
    navigate(`/leagues/${league.id}/settings`);
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1220px]">
        <PageHeader
          title="Reglas de competencia"
          subtitle="Define la estructura, clasificacion, series y reglas que aplican a esta liga."
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
              <section className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                      <SlidersHorizontal size={13} />
                      {league.name}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {summaryItems.map((item) => (
                        <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                    <ArrowLeft size={15} />
                    Volver
                  </Button>
                </div>
              </section>

              <div className="grid gap-5 lg:grid-cols-2">
                <SectionCard title="Estructura">
                  <div className="grid gap-2 sm:grid-cols-2">
                    {!isEliminationCompetition ? (
                    <OptionButton active={selectedTournamentFormat === "LEAGUE_ONLY"} onClick={() => applyTournamentFormat("LEAGUE_ONLY")}>Solo liga</OptionButton>
                    ) : null}
                    {!isEliminationCompetition ? (
                    <OptionButton active={selectedTournamentFormat === "LEAGUE_PLAYOFFS"} onClick={() => applyTournamentFormat("LEAGUE_PLAYOFFS")}>Liga + Playoffs</OptionButton>
                    ) : null}
                    <OptionButton active={selectedTournamentFormat === "SINGLE_ELIMINATION"} onClick={() => applyTournamentFormat("SINGLE_ELIMINATION")}>Eliminacion simple</OptionButton>
                    <OptionButton active={selectedTournamentFormat === "DOUBLE_ELIMINATION"} onClick={() => applyTournamentFormat("DOUBLE_ELIMINATION")}>Doble eliminacion</OptionButton>
                    <OptionButton active={selectedTournamentFormat === "PLAY_IN_PLUS_BRACKET"} onClick={() => applyTournamentFormat("PLAY_IN_PLUS_BRACKET")}>Play-In + bracket</OptionButton>
                  </div>
                  <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-500">
                    Las secciones de abajo se ajustan automaticamente para mostrar solo las reglas que aplican a esta estructura.
                  </p>
                </SectionCard>

                {showClassification ? (
                <SectionCard title="Clasificacion">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <span className="sm:col-span-2 text-sm font-semibold text-slate-700">Equipos clasificados</span>
                    {[2, 4, 6, 8, 10, 12, 14, 16, 24, 32].map((teamCount) => (
                      <OptionButton
                        key={teamCount}
                        active={selectedQualifiedTeams === teamCount}
                        disabled={usesDoubleElimination && !isPowerOfTwo(teamCount)}
                        title={
                          usesDoubleElimination && !isPowerOfTwo(teamCount)
                            ? "La doble eliminacion requiere una cantidad potencia de 2."
                            : undefined
                        }
                        onClick={() => {
                          if (usesDoubleElimination && !isPowerOfTwo(teamCount)) {
                            return;
                          }

                          setSelectedQualifiedTeams(teamCount);
                          setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                          setFormValue(setValue, "finalPhaseQualifiedTeams", teamCount);
                          const nextRecommendedByes = getRecommendedByes(teamCount);
                          const nextByes = usesPlayIn
                            ? Math.max(0, teamCount - resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots, teamCount))
                            : nextRecommendedByes;
                          setSelectedByes([0, 2, 4].includes(nextByes) ? nextByes : "CUSTOM");
                          setFormValue(setValue, "finalPhaseByes", nextByes);
                          if (usesPlayIn) {
                            const nextPlayInSlots = resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots, teamCount);
                            setSelectedPlayInSlots([0, 2, 4].includes(nextPlayInSlots) ? nextPlayInSlots : "CUSTOM");
                            setFormValue(setValue, "finalPhasePlayInSlots", nextPlayInSlots);
                            setFormValue(setValue, "finalPhaseByes", Math.max(0, teamCount - nextPlayInSlots));
                            if (nextPlayInSlots === 0) {
                              setSelectedTournamentFormat("SINGLE_ELIMINATION");
                              setFormValue(setValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
                            }
                          }
                        }}
                      >
                        {teamCount === 2 ? "Final directa" : `Top ${teamCount}`}
                      </OptionButton>
                    ))}
                    <Controller
                      name="finalPhaseQualifiedTeams"
                      control={control}
                      render={({ field, fieldState }) => (
                      <Select
                        label="Personalizado"
                        value={String(field.value)}
                        onChange={(event) => {
                          const nextTeamCount = Number(event.target.value);
                          const nextRecommendedByes = getRecommendedByes(nextTeamCount);
                          const nextByes = usesPlayIn
                            ? Math.max(0, nextTeamCount - resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots, nextTeamCount))
                            : nextRecommendedByes;
                          setSelectedQualifiedTeams("CUSTOM");
                          setSelectedByes([0, 2, 4].includes(nextByes) ? nextByes : "CUSTOM");
                          setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                          setFormValue(setValue, "finalPhaseByes", nextByes);
                          if (usesPlayIn) {
                            const nextPlayInSlots = resolvePlayInSlotsForTeamCount(values.finalPhasePlayInSlots, nextTeamCount);
                            setSelectedPlayInSlots([0, 2, 4].includes(nextPlayInSlots) ? nextPlayInSlots : "CUSTOM");
                            setFormValue(setValue, "finalPhasePlayInSlots", nextPlayInSlots);
                            setFormValue(setValue, "finalPhaseByes", Math.max(0, nextTeamCount - nextPlayInSlots));
                            if (nextPlayInSlots === 0) {
                              setSelectedTournamentFormat("SINGLE_ELIMINATION");
                              setFormValue(setValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
                            }
                          }
                          field.onChange(nextTeamCount);
                        }}
                        error={fieldState.error?.message}
                      >
                          {leagueFinalPhaseQualifiedTeamsOptions
                            .filter((teamCount) => !usesDoubleElimination || isPowerOfTwo(teamCount))
                            .map((teamCount) => (
                            <option key={teamCount} value={teamCount}>
                              {teamCount === 2 ? "Final directa" : `Top ${teamCount}`}
                            </option>
                            ))}
                        </Select>
                      )}
                    />
                  </div>
                </SectionCard>
                ) : null}

                {showByesPlayIn ? (
                <SectionCard title={usesPlayIn && supportsByes ? "Byes y Play-In" : usesPlayIn ? "Play-In" : "Byes"}>
                  <div className={cn("grid gap-4", usesPlayIn && supportsByes ? "sm:grid-cols-2" : "sm:grid-cols-1")}>
                    {supportsByes ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Byes directos</p>
                      <p className="text-xs font-medium text-slate-500">
                        Recomendado para completar un bracket de {2 ** Math.ceil(Math.log2(values.finalPhaseQualifiedTeams))} equipos.
                      </p>
                      {[0, 2, 4].map((byeCount) => (
                        <OptionButton
                          key={byeCount}
                          active={selectedByes === byeCount}
                          disabled={byeCount >= values.finalPhaseQualifiedTeams}
                          title={
                            byeCount >= values.finalPhaseQualifiedTeams
                              ? "Los byes deben ser menores que los equipos clasificados"
                              : undefined
                          }
                          onClick={() => {
                            setSelectedByes(byeCount);
                            setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                            setFormValue(setValue, "finalPhaseByes", byeCount);
                          }}
                        >
                          {byeCount} byes
                        </OptionButton>
                      ))}
                      <Controller
                        name="finalPhaseByes"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Input
                            label="Personalizado"
                            type="number"
                            min={0}
                            max={Math.max(0, values.finalPhaseQualifiedTeams - 1)}
                            value={field.value}
                            onChange={(event) => {
                              const nextValue = Math.min(
                                Number(event.target.value),
                                Math.max(0, values.finalPhaseQualifiedTeams - 1),
                              );
                              setSelectedByes("CUSTOM");
                              setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                              field.onChange(nextValue);
                            }}
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                    </div>
                    ) : null}

                    {usesPlayIn ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Cupos de Play-In</p>
                      {[0, 2, 4].map((slotCount) => (
                        <OptionButton
                          key={slotCount}
                          active={selectedPlayInSlots === slotCount}
                          disabled={slotCount >= values.finalPhaseQualifiedTeams}
                          title={
                            slotCount >= values.finalPhaseQualifiedTeams
                              ? "Los cupos de play-in deben ser menores que los equipos clasificados"
                              : undefined
                          }
                          onClick={() => {
                            setSelectedPlayInSlots(slotCount);
                            setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                            setFormValue(setValue, "finalPhasePlayInSlots", slotCount);
                            setFormValue(setValue, "finalPhaseFormat", slotCount > 0 ? "PLAY_IN_PLUS_BRACKET" : "SINGLE_ELIMINATION");
                            setFormValue(
                              setValue,
                              "finalPhaseByes",
                              slotCount > 0
                                ? Math.max(0, values.finalPhaseQualifiedTeams - slotCount)
                                : getRecommendedByes(values.finalPhaseQualifiedTeams),
                            );
                            setSelectedByes(
                              slotCount > 0
                                ? ([0, 2, 4].includes(Math.max(0, values.finalPhaseQualifiedTeams - slotCount))
                                  ? Math.max(0, values.finalPhaseQualifiedTeams - slotCount)
                                  : "CUSTOM")
                                : ([0, 2, 4].includes(getRecommendedByes(values.finalPhaseQualifiedTeams))
                                  ? getRecommendedByes(values.finalPhaseQualifiedTeams)
                                  : "CUSTOM"),
                            );
                            if (slotCount === 0) {
                              setSelectedTournamentFormat("SINGLE_ELIMINATION");
                            }
                          }}
                        >
                          {slotCount} cupos
                        </OptionButton>
                      ))}
                      <Controller
                        name="finalPhasePlayInSlots"
                        control={control}
                        render={({ field, fieldState }) => (
                          <Input
                            label="Personalizado"
                            type="number"
                            min={0}
                            max={Math.max(0, values.finalPhaseQualifiedTeams - 1)}
                            value={field.value}
                            onChange={(event) => {
                              const requestedValue = Math.min(
                                Number(event.target.value),
                                Math.max(0, values.finalPhaseQualifiedTeams - 1),
                              );
                              const nextValue = requestedValue > 0
                                ? resolvePlayInSlotsForTeamCount(requestedValue, values.finalPhaseQualifiedTeams)
                                : 0;
                              const nextByes = nextValue > 0
                                ? Math.max(0, values.finalPhaseQualifiedTeams - nextValue)
                                : getRecommendedByes(values.finalPhaseQualifiedTeams);
                              setSelectedPlayInSlots("CUSTOM");
                              setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                              setFormValue(setValue, "finalPhaseFormat", nextValue > 0 ? "PLAY_IN_PLUS_BRACKET" : "SINGLE_ELIMINATION");
                              setFormValue(setValue, "finalPhasePlayInSlots", nextValue);
                              setFormValue(setValue, "finalPhaseByes", nextByes);
                              setSelectedByes([0, 2, 4].includes(nextByes) ? nextByes : "CUSTOM");
                              if (nextValue === 0) {
                                setSelectedTournamentFormat("SINGLE_ELIMINATION");
                              }
                              field.onChange(nextValue);
                            }}
                            error={fieldState.error?.message}
                          />
                        )}
                      />
                    </div>
                    ) : null}
                  </div>
                </SectionCard>
                ) : null}

                {showSeries ? (
                <SectionCard title="Series eliminatorias">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <OptionButton active={selectedSeries === "SINGLE_GAME"} onClick={() => {
                      setSelectedSeries("SINGLE_GAME");
                      setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                      setFormValue(setValue, "finalPhaseTwoLegs", false);
                      setFormValue(setValue, "finalPhaseRoundBestOf", 1);
                      setFormValue(setValue, "finalPhaseFinalBestOf", usesDoubleElimination ? 3 : 1);
                    }}>Partido unico</OptionButton>
                    <OptionButton
                      active={selectedSeries === "HOME_AWAY"}
                      disabled={usesDoubleElimination || usesPlayIn}
                      title={
                        usesDoubleElimination
                          ? "La doble eliminacion usa partido unico para evitar cruces inconsistentes"
                          : usesPlayIn
                            ? "Play-In usa partido unico para no mezclar reglas de clasificacion"
                            : undefined
                      }
                      onClick={() => {
                      setSelectedSeries("HOME_AWAY");
                      setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                      setFormValue(setValue, "finalPhaseFormat", "SINGLE_ELIMINATION");
                      setFormValue(setValue, "finalPhaseTwoLegs", true);
                    }}>Ida y vuelta</OptionButton>
                    {[3, 5, 7].map((bestOf) => (
                      <OptionButton
                        key={bestOf}
                        active={selectedSeries === `BEST_OF_${bestOf}`}
                        disabled={usesDoubleElimination}
                        title={usesDoubleElimination ? "La doble eliminacion usa partido unico para evitar cruces inconsistentes" : undefined}
                        onClick={() => {
                        setSelectedSeries(`BEST_OF_${bestOf}` as SeriesSelection);
                        setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                        setFormValue(setValue, "finalPhaseTwoLegs", false);
                        setFormValue(setValue, "finalPhaseRoundBestOf", bestOf);
                        setFormValue(setValue, "finalPhaseFinalBestOf", bestOf);
                      }}>Mejor de {bestOf}</OptionButton>
                    ))}
                  </div>
                </SectionCard>
                ) : null}

                {showRoundConfig ? (
                <SectionCard title="Configuracion por ronda">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      ["Rondas previas mejor de", "finalPhaseRoundBestOf"],
                      ["Final mejor de", "finalPhaseFinalBestOf"],
                    ].map(([label, fieldName]) => (
                      <Controller
                        key={`${label}-${fieldName}`}
                        name={fieldName as "finalPhaseRoundBestOf" | "finalPhaseFinalBestOf"}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Select
                            label={label}
                            value={String(field.value)}
                            onChange={(event) => {
                              setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                              field.onChange(Number(event.target.value));
                            }}
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
                    ))}
                    <Controller
                      name="finalPhaseTwoLegs"
                      control={control}
                      render={({ field }) => (
                        <Select
                          label="Series eliminatorias"
                          value={field.value ? "true" : "false"}
                          onChange={(event) => {
                            if (usesPlayIn && event.target.value === "true") {
                              return;
                            }

                            setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                            field.onChange(event.target.value === "true");
                          }}
                        >
                          <option value="false">Partido unico / mejor de</option>
                          <option value="true" disabled={usesPlayIn}>
                            Ida y vuelta
                          </option>
                        </Select>
                      )}
                    />
                  </div>
                </SectionCard>
                ) : null}

                {showExtraRules ? (
                <SectionCard title="Reglas extra">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <OptionButton active={values.finalPhaseThirdPlaceMatch} onClick={() => {
                      setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                      setFormValue(setValue, "finalPhaseThirdPlaceMatch", !values.finalPhaseThirdPlaceMatch);
                    }}>Juego por tercer lugar</OptionButton>
                    <OptionButton active={values.finalPhaseSeededHomeAdvantage} onClick={() => {
                      setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                      setFormValue(setValue, "finalPhaseSeededHomeAdvantage", !values.finalPhaseSeededHomeAdvantage);
                    }}>Mejor sembrado local</OptionButton>
                    <OptionButton active={values.finalPhaseReseedEachRound} onClick={() => {
                      setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                      setFormValue(setValue, "finalPhaseReseedEachRound", !values.finalPhaseReseedEachRound);
                    }}>Resiembra por ronda</OptionButton>
                    {usesDoubleElimination ? (
                    <OptionButton active={values.finalPhaseGrandFinalReset} onClick={() => {
                      setFormValue(setValue, "finalPhasePreset", "CUSTOM");
                      setFormValue(setValue, "finalPhaseFormat", "DOUBLE_ELIMINATION");
                      setFormValue(setValue, "finalPhaseTwoLegs", false);
                      setFormValue(setValue, "finalPhaseGrandFinalReset", !values.finalPhaseGrandFinalReset);
                    }}>Reset en gran final</OptionButton>
                    ) : null}
                  </div>
                </SectionCard>
                ) : null}
              </div>

              <FormErrors message={mutationError instanceof Error ? mutationError.message : null} />

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
                  <ArrowLeft size={15} />
                  Volver
                </Button>

                <Button type="submit" variant="primary" disabled={submitting || !formState.isValid}>
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
