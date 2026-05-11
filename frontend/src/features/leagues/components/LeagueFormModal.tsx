import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  CircleUserRound,
  ImagePlus,
  LayoutGrid,
  Mail,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/features/leagues/components/FormErrors";
import {
  leagueTrackedStatOptions,
  normalizeLeagueTrackedStats,
  sanitizeLeagueTeamIds,
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
import { Button, Input, Modal, Select } from "@/shared/components/ui";
import { getBase64ImageSrc, imageFileToPngBase64 } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type LeagueFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialLeague?: LeagueListItem | LeagueDetail | null;
  teams: ApiTeam[];
  loading?: boolean;
  apiError?: unknown;
  onClose: () => void;
  onSubmit: (values: LeagueFormValues) => Promise<void> | void;
};

type LeagueFormFieldName = Extract<keyof LeagueFormValues, string>;

const fieldClassName = "rounded-[14px] border-slate-200 bg-slate-100/90 py-2.5 text-slate-700";

export function LeagueFormModal({
  isOpen,
  mode,
  initialLeague,
  teams,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: LeagueFormModalProps) {
  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toLeagueFormValues(null),
  });
  const [logoError, setLogoError] = useState<string | null>(null);
  const [teamsExpanded, setTeamsExpanded] = useState(false);
  const [dismissedApiFields, setDismissedApiFields] = useState<Partial<Record<LeagueFormFieldName, true>>>({});
  const teamsSectionRef = useRef<HTMLDivElement | null>(null);

  const logoBase64 = watch("logoBase64");
  const selectedTeamIds = watch("teamIds") ?? [];
  const rawTrackedStats = watch("trackedStats");
  const trackedStats = useMemo(() => rawTrackedStats ?? [], [rawTrackedStats]);
  const logoSrc = getBase64ImageSrc(logoBase64);
  const apiFormError = mapApiErrorToForm(apiError, leagueFormApiFieldMap, leagueFormApiMessageFieldMap);

  useEffect(() => {
    if (isOpen) {
      const nextValues = toLeagueFormValues(initialLeague);
      setLogoError(null);
      setDismissedApiFields({});
      setTeamsExpanded(mode === "edit" || nextValues.teamIds.length > 0);
      reset(nextValues);
      return;
    }

    setLogoError(null);
    setDismissedApiFields({});
    setTeamsExpanded(false);
    reset(toLeagueFormValues(null));
  }, [initialLeague, isOpen, mode, reset]);

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
      const nextLogoBase64 = await imageFileToPngBase64(file);
      setValue("logoBase64", nextLogoBase64, {
        shouldDirty: true,
        shouldValidate: true,
      });
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

  const toggleTeam = (teamId: number) => {
    dismissApiFieldError("teamIds");

    const nextTeamIds = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter((id) => id !== teamId)
      : sanitizeLeagueTeamIds([...selectedTeamIds, teamId]);

    setValue("teamIds", nextTeamIds, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleTeamsSection = () => {
    setTeamsExpanded((current) => {
      const next = !current;

      if (!current) {
        window.requestAnimationFrame(() => {
          teamsSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        });
      }

      return next;
    });
  };

  const submitForm = async (values: LeagueFormValues) => {
    await onSubmit(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      maxWidthClassName="max-w-5xl"
      hideCloseButton
    >
      <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit(submitForm)}>
        <div className="px-2">
          <h2 className="text-[30px] leading-none sm:text-[34px]">{mode === "create" ? "Crear liga" : "Editar liga"}</h2>
        </div>

        <div className="rounded-[32px] border border-slate-300 bg-[radial-gradient(circle_at_top,_rgba(255,237,223,0.68),_transparent_35%),linear-gradient(180deg,_#ffffff,_#fbfbfb)] p-2 shadow-[0_22px_54px_rgba(15,23,42,0.08)]">
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 sm:px-7 sm:py-8">
            <div className="flex flex-col items-center">
              <label className={cn("mt-3 inline-flex cursor-pointer flex-col items-center gap-2", loading && "pointer-events-none opacity-50")}>
                <span className="sr-only">Seleccionar logo de la liga</span>
                <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-200 text-slate-500 shadow-inner">
                  {logoSrc ? <img src={logoSrc} alt="Logo de la liga" className="h-full w-full object-cover" /> : <ImagePlus size={26} />}
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
                  <button
                    type="button"
                    onClick={clearLogo}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Quitar
                  </button>
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
                      label="Nombre de la liga"
                      value={field.value}
                      onChange={(event) => {
                        dismissApiFieldError("name");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      placeholder="Liga Municipal Primavera"
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

                <div className="rounded-[24px] border border-orange-100 bg-[linear-gradient(180deg,_rgba(255,246,238,0.96),_#ffffff)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                      <ShieldCheck size={18} />
                    </span>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">Datos que se registraran en liga</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Activa o desactiva las metricas que quieres mostrar desde este torneo.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {displayedTrackedStats.map((stat) => {
                      const active = trackedStats.includes(stat);

                      return (
                        <div
                          key={stat}
                          className={cn(
                            "flex items-center justify-between rounded-[14px] border px-3 py-2 transition",
                            active
                              ? "border-slate-200 bg-white text-slate-700 shadow-sm"
                              : "border-dashed border-slate-200 bg-slate-50 text-slate-400",
                          )}
                        >
                          <span className="text-sm font-medium">{stat}</span>

                          <button
                            type="button"
                            onClick={() => toggleTrackedStat(stat)}
                            disabled={loading}
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50",
                              active ? "bg-orange-400 text-white hover:bg-orange-500" : "bg-white text-orange-500 shadow-sm hover:bg-orange-50",
                            )}
                            aria-label={active ? `Quitar ${stat}` : `Agregar ${stat}`}
                          >
                            {active ? <Trash2 size={14} /> : <Plus size={14} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {getApiFieldError("trackedStats") ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{getApiFieldError("trackedStats")}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          ref={teamsSectionRef}
          className="rounded-[28px] border border-slate-300 bg-white px-5 py-5 shadow-[0_14px_32px_rgba(15,23,42,0.05)]"
        >
          <button type="button" onClick={toggleTeamsSection} className="flex w-full items-center justify-between gap-3 text-left">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <UsersRound size={16} className="text-orange-500" />
                Equipos participantes
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedTeamIds.length} seleccionados de {teams.length} disponibles
              </p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {teamsExpanded ? "Ocultar" : "Seleccionar"}
              {teamsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {teamsExpanded ? (
            teams.length > 0 ? (
              <div className="mt-4 grid max-h-64 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {teams.map((team) => {
                  const active = selectedTeamIds.includes(team.id);

                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggleTeam(team.id)}
                      disabled={loading}
                      className={cn(
                        "rounded-[18px] border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                        active ? "border-orange-200 bg-orange-50 text-slate-900 shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <p className="font-semibold">{team.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{active ? "Actualmente seleccionado" : "Equipo disponible"}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                Todavia no hay equipos para asignar a la liga.
              </div>
            )
          ) : null}

          {getApiFieldError("teamIds") ? (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{getApiFieldError("teamIds")}</p>
          ) : selectedTeamIds.length < 2 ? (
            <p className="mt-3 text-xs font-medium text-amber-700">Se recomienda seleccionar al menos 2 equipos para armar la liga.</p>
          ) : null}
        </div>

        <FormErrors message={apiFormError.globalMessage} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-h-[20px]" />

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={toggleTeamsSection}
              disabled={loading}
              className="border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
            >
              Asignar equipos
            </Button>
            <Button type="submit" variant="primary" disabled={loading || !formState.isValid}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
