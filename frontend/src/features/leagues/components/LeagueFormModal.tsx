import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  ImagePlus,
  LayoutGrid,
  Medal,
  Mail,
  Pencil,
  ShieldCheck,
  SlidersHorizontal,
  Trophy,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import { FormErrors } from "@/features/leagues/components/FormErrors";
import {
  applyMainFinalPhasePreset,
  mainFinalPhasePresetOptions,
  type MainFinalPhasePresetOption,
} from "@/features/leagues/finalPhaseConfig";
import {
  type CompetitionType,
  leagueTrackedStatOptions,
  normalizeLeagueTrackedStats,
  type LeagueDetail,
  type LeagueFormValues,
  type LeagueListItem,
} from "@/features/leagues/Leagues.types";
import {
  LEAGUE_FORM_LIMITS,
  leagueFormApiFieldMap,
  leagueFormApiMessageFieldMap,
  leagueFormSchema,
  toLeagueFormValues,
} from "@/features/leagues/schemas/Leagues.schema";
import type { ApiTeam } from "@/features/teams/Teams.types";
import { mapApiErrorToForm } from "@/shared/api/client";
import { Button, ImageCropperModal, Input, Modal, Select } from "@/shared/components/ui";
import { getBase64ImageSrc, readImageFileAsDataUrl } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type LeagueFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  competitionType?: CompetitionType;
  initialLeague?: LeagueListItem | LeagueDetail | null;
  teams: ApiTeam[];
  loading?: boolean;
  apiError?: unknown;
  advancedSettingsHref?: string;
  onClose: () => void;
  onSubmit: (values: LeagueFormValues) => Promise<LeagueListItem | void> | LeagueListItem | void;
};

type LeagueFormFieldName = Extract<keyof LeagueFormValues, string>;

const fieldClassName = "rounded-[14px] border-slate-200 bg-slate-100/90 py-2.5 text-slate-700";

type SelectedMainPresetOption = MainFinalPhasePresetOption | "ADVANCED";

function toMainPresetValue(values: LeagueFormValues): SelectedMainPresetOption {
  if (!values.finalPhaseEnabled) {
    return "LEAGUE_ONLY";
  }

  const backendPresets: MainFinalPhasePresetOption[] = [
    "TOP_4_SINGLE_GAME",
    "TOP_8_SINGLE_GAME",
    "TOP_8_HOME_AWAY",
    "TOP_6_SINGLE_GAME_WITH_BYES",
    "TOP_16_SINGLE_GAME",
    "TOP_32_SINGLE_GAME",
    "NBA_PLAY_IN_TOP_10",
    "DOUBLE_ELIMINATION_TOP_8",
    "DOUBLE_ELIMINATION_TOP_16",
  ];

  if (backendPresets.includes(values.finalPhasePreset as MainFinalPhasePresetOption)) {
    return values.finalPhasePreset as MainFinalPhasePresetOption;
  }

  if (
    values.finalPhasePreset === "CUSTOM"
    && values.finalPhaseFormat === "SINGLE_ELIMINATION"
    && values.finalPhaseQualifiedTeams === 8
    && values.finalPhaseByes === 0
    && !values.finalPhaseTwoLegs
    && values.finalPhasePlayInSlots === 0
    && values.finalPhaseRoundBestOf === 3
    && values.finalPhaseFinalBestOf === 3
    && !values.finalPhaseReseedEachRound
    && !values.finalPhaseGrandFinalReset
  ) {
    return "TOP_8_BEST_OF_3";
  }

  return "ADVANCED";
}

export function LeagueFormModal({
  isOpen,
  mode,
  competitionType = "LEAGUE",
  initialLeague,
  teams: _teams,
  loading = false,
  apiError,
  advancedSettingsHref,
  onClose,
  onSubmit,
}: LeagueFormModalProps) {
  void _teams;
  const navigate = useNavigate();
  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema) as Resolver<LeagueFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toLeagueFormValues(null),
  });
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pendingLogoSource, setPendingLogoSource] = useState<string | null>(null);
  const [dismissedApiFields, setDismissedApiFields] = useState<Partial<Record<LeagueFormFieldName, true>>>({});
  const [editorStep, setEditorStep] = useState<1 | 2>(1);

  const logoBase64 = watch("logoBase64");
  const rawTrackedStats = watch("trackedStats");
  const trackedStats = useMemo(() => rawTrackedStats ?? [], [rawTrackedStats]);
  const isElimination = competitionType === "ELIMINATION";
  const entityLabel = competitionType === "ELIMINATION" ? "eliminatoria" : "liga";
  const presetOptions = useMemo(
    () => mainFinalPhasePresetOptions.filter((preset) => !isElimination || preset.value !== "LEAGUE_ONLY"),
    [isElimination],
  );
  const logoSrc = getBase64ImageSrc(logoBase64);
  const apiFormError = mapApiErrorToForm(apiError, leagueFormApiFieldMap, leagueFormApiMessageFieldMap);
  const [selectedMainPreset, setSelectedMainPreset] = useState<SelectedMainPresetOption>("TOP_8_SINGLE_GAME");

  useEffect(() => {
    if (isOpen) {
      const nextValues = toLeagueFormValues(initialLeague);
      nextValues.competitionType = competitionType;
      if (isElimination) {
        nextValues.finalPhaseEnabled = true;
      }
      setSelectedMainPreset(toMainPresetValue(nextValues));
      setEditorStep(1);
      setLogoError(null);
      setPendingLogoSource(null);
      setDismissedApiFields({});
      reset(nextValues);
      return;
    }

    setEditorStep(1);
    setLogoError(null);
    setPendingLogoSource(null);
    setDismissedApiFields({});
    const emptyValues = toLeagueFormValues(null);
    emptyValues.competitionType = competitionType;
    if (isElimination) {
      emptyValues.finalPhaseEnabled = true;
    }
    setSelectedMainPreset(toMainPresetValue(emptyValues));
    reset(emptyValues);
  }, [competitionType, initialLeague, isElimination, isOpen, reset]);

  useEffect(() => {
    setDismissedApiFields({});
  }, [apiError]);

  const displayedTrackedStats = useMemo(
    () => normalizeLeagueTrackedStats([...leagueTrackedStatOptions, ...trackedStats]),
    [trackedStats],
  );

  const dismissApiFieldError = (fieldName: LeagueFormFieldName) => {
    setDismissedApiFields((current) => {
      if (current[fieldName]) {
        return current;
      }

      return {
        ...current,
        [fieldName]: true,
      };
    });
  };

  const getApiFieldError = (fieldName: LeagueFormFieldName) => {
    if (dismissedApiFields[fieldName]) {
      return undefined;
    }

    return apiFormError.fieldErrors[fieldName];
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLogoError("Selecciona un archivo de imagen valido.");
      return;
    }

    setLogoError(null);
    dismissApiFieldError("logoBase64");

    try {
      const nextLogoSource = await readImageFileAsDataUrl(file);
      setPendingLogoSource(nextLogoSource);
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "No se pudo cargar el logo.");
    }
  };

  const clearLogo = () => {
    setLogoError(null);
    dismissApiFieldError("logoBase64");
    setValue("logoBase64", null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const reopenLogoEditor = () => {
    const currentLogoSource = getBase64ImageSrc(logoBase64);
    if (!currentLogoSource) {
      return;
    }

    setLogoError(null);
    dismissApiFieldError("logoBase64");
    setPendingLogoSource(currentLogoSource);
  };

  const toggleTrackedStat = (stat: string) => {
    dismissApiFieldError("trackedStats");

    const nextTrackedStats = trackedStats.includes(stat)
      ? trackedStats.filter((currentStat) => currentStat !== stat)
      : [...trackedStats, stat];

    setValue("trackedStats", nextTrackedStats, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const dismissFinalPhaseErrors = () => {
    dismissApiFieldError("finalPhaseEnabled");
    dismissApiFieldError("finalPhasePreset");
    dismissApiFieldError("finalPhaseQualifiedTeams");
    dismissApiFieldError("finalPhaseByes");
    dismissApiFieldError("finalPhaseFormat");
    dismissApiFieldError("finalPhaseTwoLegs");
    dismissApiFieldError("finalPhaseThirdPlaceMatch");
    dismissApiFieldError("finalPhaseSeededHomeAdvantage");
    dismissApiFieldError("finalPhasePlayInSlots");
    dismissApiFieldError("finalPhaseRoundBestOf");
    dismissApiFieldError("finalPhaseFinalBestOf");
    dismissApiFieldError("finalPhaseReseedEachRound");
    dismissApiFieldError("finalPhaseGrandFinalReset");
  };

  const submitForm = async (values: LeagueFormValues) => {
    const savedLeague = await onSubmit({
      ...values,
      finalPhaseEnabled: isElimination ? true : values.finalPhaseEnabled,
      competitionType,
    });

    return savedLeague;
  };

  const goPrevStep = () => setEditorStep((current) => (current === 1 ? 2 : 1));
  const goNextStep = () => setEditorStep((current) => (current === 2 ? 1 : 2));

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={loading ? () => undefined : onClose}
        maxWidthClassName="max-w-5xl"
        hideCloseButton
      >
        <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit(submitForm)}>
        <div className="px-2">
          <h2 className="text-[30px] leading-none sm:text-[34px]">
            {mode === "create" ? `Crear ${entityLabel}` : `Editar ${entityLabel}`}
          </h2>
        </div>

        <div className="rounded-[32px] border border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(255,237,223,0.68),_transparent_35%),linear-gradient(180deg,_#ffffff,_#fbfbfb)] p-2 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex items-center justify-between gap-3 px-1 py-1">
              <Button type="button" variant="ghost" onClick={goPrevStep} disabled={loading} className="rounded-full px-3 py-2">
                <ChevronLeft size={16} />
              </Button>

              <div className="min-w-0 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {editorStep === 1 ? "Datos generales" : isElimination ? "Configurar eliminatoria" : "Configurar fase final"}
                </p>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full transition", editorStep === 1 ? "bg-orange-500" : "bg-slate-300")} />
                  <span className={cn("h-2.5 w-2.5 rounded-full transition", editorStep === 2 ? "bg-orange-500" : "bg-slate-300")} />
                </div>
              </div>

              <Button type="button" variant="ghost" onClick={goNextStep} disabled={loading} className="rounded-full px-3 py-2">
                <ChevronRight size={16} />
              </Button>
            </div>

            {editorStep === 1 ? (
              <>
                <div className="mt-3 flex flex-col items-center">
                  <label className={cn("inline-flex cursor-pointer flex-col items-center gap-2", loading && "pointer-events-none opacity-50")}>
                    <span className="sr-only">{`Seleccionar logo de la ${entityLabel}`}</span>
                    <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-200 text-slate-500 shadow-inner">
                      {logoSrc ? (
                        <img src={logoSrc} alt={`Logo de la ${entityLabel}`} className="h-full w-full object-cover" />
                      ) : (
                        <ImagePlus size={26} />
                      )}
                    </span>
                    <input type="file" accept="image/*" className="sr-only" disabled={loading} onChange={handleLogoChange} />
                  </label>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                    <label
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100",
                        loading && "pointer-events-none opacity-50",
                      )}
                    >
                      <Upload size={12} />
                      {logoBase64 ? "Cambiar logo" : "Subir logo"}
                      <input type="file" accept="image/*" className="sr-only" disabled={loading} onChange={handleLogoChange} />
                    </label>

                    {logoBase64 ? (
                      <>
                        <button
                          type="button"
                          onClick={reopenLogoEditor}
                          disabled={loading}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil size={12} />
                          Editar logo
                        </button>

                        <button
                          type="button"
                          onClick={clearLogo}
                          disabled={loading}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          Quitar
                        </button>
                      </>
                    ) : null}
                  </div>

                  {logoError ? (
                    <p className="mt-2 text-center text-xs font-medium text-red-600">{logoError}</p>
                  ) : getApiFieldError("logoBase64") ? (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                      {getApiFieldError("logoBase64")}
                    </p>
                  ) : null}
                </div>

            <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(280px,0.78fr)]">
              <div className="space-y-4">
                <Controller
                  name="name"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      label={`Nombre de la ${entityLabel}`}
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("name");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      placeholder={isElimination ? "Eliminatoria Estatal 2026" : "Liga Municipal Primavera"}
                      leftIcon={<CircleUserRound size={14} />}
                      maxLength={LEAGUE_FORM_LIMITS.name}
                      error={fieldState.error?.message ?? getApiFieldError("name")}
                      disabled={loading}
                      className={fieldClassName}
                    />
                  )}
                />

                <Controller
                  name="responsibleName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      label="Nombre del responsable"
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("responsibleName");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      placeholder="Alex Caruso"
                      leftIcon={<CircleUserRound size={14} />}
                      maxLength={LEAGUE_FORM_LIMITS.responsibleName}
                      error={fieldState.error?.message ?? getApiFieldError("responsibleName")}
                      disabled={loading}
                      className={fieldClassName}
                    />
                  )}
                />

                <Controller
                  name="responsibleEmail"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      label="Correo del responsable"
                      type="email"
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("responsibleEmail");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      placeholder="alex@scoreblaze.com"
                      leftIcon={<Mail size={14} />}
                      maxLength={LEAGUE_FORM_LIMITS.responsibleEmail}
                      error={fieldState.error?.message ?? getApiFieldError("responsibleEmail")}
                      disabled={loading}
                      className={fieldClassName}
                    />
                  )}
                />

                <Controller
                  name="category"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      label="Categoria"
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("category");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      placeholder="Basquet varonil"
                      leftIcon={<LayoutGrid size={14} />}
                      maxLength={LEAGUE_FORM_LIMITS.category}
                      error={fieldState.error?.message ?? getApiFieldError("category")}
                      disabled={loading}
                      className={fieldClassName}
                    />
                  )}
                />
              </div>

              <div className="space-y-4">
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      label="Fecha de inicio"
                      type="date"
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("startDate");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      leftIcon={<CalendarDays size={14} />}
                      error={fieldState.error?.message ?? getApiFieldError("startDate")}
                      disabled={loading}
                      className={fieldClassName}
                    />
                  )}
                />

                <Controller
                  name="endDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      label="Fecha de fin"
                      type="date"
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("endDate");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      leftIcon={<CalendarDays size={14} />}
                      error={fieldState.error?.message ?? getApiFieldError("endDate")}
                      disabled={loading}
                      className={fieldClassName}
                    />
                  )}
                />

                {mode === "edit" ? (
                  <Controller
                    name="status"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Select
                        label="Estatus"
                        value={field.value}
                        onChange={(event) => {
                          dismissApiFieldError("status");
                          field.onChange(event.target.value);
                        }}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message ?? getApiFieldError("status")}
                        disabled={loading}
                        className={fieldClassName}
                      >
                        <option value="Sin empezar">Sin empezar</option>
                        <option value="En curso">En curso</option>
                        <option value="Finalizada">Finalizada</option>
                      </Select>
                    )}
                  />
                ) : null}
              </div>
            </div>

              </>
            ) : null}

            {editorStep === 2 ? (
              <>
            <div className="mt-8 rounded-[26px] border border-orange-100 bg-[linear-gradient(180deg,_rgba(255,246,238,0.96),_#ffffff)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <ShieldCheck size={18} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{`Datos que se registraran en la ${entityLabel}`}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Elige que metricas quieres habilitar para el seguimiento y la tabla de este torneo.
                    </p>
                  </div>
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600 shadow-sm">
                  <span>{trackedStats.length}</span>
                  <span>activas</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {displayedTrackedStats.map((stat) => {
                  const active = trackedStats.includes(stat);

                  return (
                    <button
                      key={stat}
                      type="button"
                      onClick={() => toggleTrackedStat(stat)}
                      disabled={loading}
                      aria-pressed={active}
                      className={cn(
                        "rounded-[18px] border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                        active
                          ? "border-orange-200 bg-orange-50 text-slate-900 shadow-[0_10px_24px_rgba(249,115,22,0.10)]"
                          : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50/50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold">{stat}</span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                            active ? "bg-white text-orange-600" : "bg-slate-100 text-slate-400",
                          )}
                        >
                          {active ? "Activa" : "Oculta"}
                        </span>
                      </div>
                      <p className={cn("mt-2 text-xs", active ? "text-slate-500" : "text-slate-400")}>
                        {active
                          ? `Se mostrara dentro del seguimiento de esta ${entityLabel}.`
                          : "Tocala para activarla en este torneo."}
                      </p>
                    </button>
                  );
                })}
              </div>

              {getApiFieldError("trackedStats") ? (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{getApiFieldError("trackedStats")}</p>
              ) : null}
            </div>

            <div className="mt-6 rounded-[26px] border border-sky-100 bg-[linear-gradient(180deg,_rgba(240,249,255,0.96),_#ffffff)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
                    {isElimination ? <Medal size={18} /> : <Trophy size={18} />}
                  </span>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">Estructura de competencia</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {isElimination
                        ? "Elige la estructura base para esta eliminatoria."
                        : `Define si la ${entityLabel} se juega solo como liga, con playoffs o con grupos.`}
                    </p>
                  </div>
                </div>
              </div>

              <Controller
                name="finalPhasePreset"
                control={control}
                render={({ field }) => (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {presetOptions.map((preset) => {
                      const active = selectedMainPreset === preset.value;

                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            dismissFinalPhaseErrors();
                            setSelectedMainPreset(preset.value);
                            applyMainFinalPhasePreset(setValue, preset.value);
                            field.onChange(
                              preset.value === "TOP_4_SINGLE_GAME"
                              || preset.value === "TOP_8_SINGLE_GAME"
                              || preset.value === "TOP_8_HOME_AWAY"
                              || preset.value === "TOP_6_SINGLE_GAME_WITH_BYES"
                              || preset.value === "TOP_16_SINGLE_GAME"
                              || preset.value === "TOP_32_SINGLE_GAME"
                              || preset.value === "NBA_PLAY_IN_TOP_10"
                              || preset.value === "DOUBLE_ELIMINATION_TOP_8"
                              || preset.value === "DOUBLE_ELIMINATION_TOP_16"
                                ? preset.value
                                : "CUSTOM",
                            );
                          }}
                          disabled={loading}
                          aria-pressed={active}
                          className={cn(
                            "min-h-[86px] rounded-[18px] border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                            active
                              ? "border-sky-200 bg-white text-slate-950 shadow-[0_12px_24px_rgba(14,165,233,0.12)]"
                              : "border-slate-200 bg-white/70 text-slate-600 hover:border-sky-200 hover:bg-white hover:text-slate-900",
                          )}
                        >
                          <span className="block text-sm font-semibold leading-snug">{preset.label}</span>
                          <span
                            className={cn(
                              "mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                              active ? "bg-sky-50 text-sky-700" : "bg-slate-100 text-slate-400",
                            )}
                          >
                            {active ? "Seleccionado" : "Elegir"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              />

              {getApiFieldError("finalPhasePreset") ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {getApiFieldError("finalPhasePreset")}
                </p>
              ) : null}

              <div className="mt-5 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSubmit(async (values) => {
                    if (advancedSettingsHref) {
                      onClose();
                      navigate(advancedSettingsHref);
                      return;
                    }
                    const savedLeague = await submitForm(values);
                    if (savedLeague?.id) {
                      navigate(`/leagues/${savedLeague.id}/final-phase/settings`);
                    }
                  })}
                  disabled={loading || (!advancedSettingsHref && !formState.isValid)}
                  title={
                    advancedSettingsHref
                      ? "Configurar reglas de competencia"
                      : "Guarda la competencia y configura sus reglas"
                  }
                  className="shrink-0"
                >
                  <SlidersHorizontal size={15} />
                  Configurar reglas
                </Button>
              </div>
            </div>
              </>
            ) : null}
          </div>
        </div>

        <FormErrors message={apiFormError.globalMessage} />

        <div className="flex justify-end">
          <div className="flex justify-end">
            <Button
              type={editorStep === 1 ? "button" : "submit"}
              variant="primary"
              onClick={editorStep === 1 ? () => setEditorStep(2) : undefined}
              disabled={loading || (editorStep !== 1 && !formState.isValid)}
            >
              {editorStep === 1 ? "Continuar" : loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
        </form>
      </Modal>

      <ImageCropperModal
        isOpen={pendingLogoSource !== null}
        imageSrc={pendingLogoSource}
        title={`Ajustar logo de la ${entityLabel}`}
        exportShape="circle"
        onClose={() => setPendingLogoSource(null)}
        onConfirm={(nextLogoBase64) => {
          setValue("logoBase64", nextLogoBase64, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setPendingLogoSource(null);
        }}
      />
    </>
  );
}

