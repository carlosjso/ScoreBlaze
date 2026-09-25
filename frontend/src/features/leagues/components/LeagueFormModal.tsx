import { zodResolver } from "@hookform/resolvers/zod";
import {
  Activity,
  CalendarDays,
  Check,
  CircleUserRound,
  ImagePlus,
  LayoutGrid,
  Mail,
  Medal,
  Pencil,
  ShieldCheck,
  Trophy,
  Trash2,
  Upload,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { FormErrors } from "@/features/leagues/components/FormErrors";
import { applyPresetDefaults } from "@/features/leagues/finalPhaseConfig";
import {
  leagueTrackedStatOptions,
  normalizeLeagueTrackedStats,
  type CompetitionType,
  type LeagueDetail,
  type LeagueFormSubmitOptions,
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
import { mapApiErrorToForm } from "@/shared/api/client";
import { Button, ImageCropperModal, Input, Modal, Select } from "@/shared/components/ui";
import { getBase64ImageSrc, readImageFileAsDataUrl } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type LeagueFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  competitionType?: CompetitionType;
  initialLeague?: LeagueListItem | LeagueDetail | null;
  loading?: boolean;
  apiError?: unknown;
  onClose: () => void;
  onSubmit: (values: LeagueFormValues, options?: LeagueFormSubmitOptions) => Promise<LeagueListItem | void> | LeagueListItem | void;
};

type LeagueFormFieldName = Extract<keyof LeagueFormValues, string>;
type BasicCompetitionStructure = "LEAGUE_ONLY" | "LEAGUE_PLAYOFFS" | "ELIMINATION" | "GROUPS";

const fieldClassName = "rounded-[14px] border-slate-200 bg-slate-100/90 py-2.5 text-slate-700";

function getStructure(values: LeagueFormValues): BasicCompetitionStructure {
  if (values.competitionType === "ELIMINATION") return "ELIMINATION";
  if (values.competitionType === "GROUPS") return "GROUPS";
  return values.finalPhaseEnabled ? "LEAGUE_PLAYOFFS" : "LEAGUE_ONLY";
}

function ModeCard({
  selected,
  disabled,
  icon,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  disabled?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "group rounded-[18px] border p-3.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-orange-300 bg-orange-50 shadow-[0_10px_24px_rgba(249,115,22,0.10)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-sky-200 hover:bg-sky-50/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-xl border",
          selected ? "border-orange-200 bg-white text-orange-700" : "border-slate-200 bg-slate-50 text-slate-500",
        )}>
          {icon}
        </span>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-[0.13em]",
          selected ? "text-orange-700" : "text-slate-400",
        )}>
          {selected ? <span className="inline-flex items-center gap-1"><Check size={12} /> Elegido</span> : disabled ? "No disponible" : "Elegir"}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </button>
  );
}

export function LeagueFormModal({
  isOpen,
  mode,
  competitionType = "LEAGUE",
  initialLeague,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: LeagueFormModalProps) {
  const { control, handleSubmit, reset, setValue, watch, formState } = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema) as Resolver<LeagueFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toLeagueFormValues(null),
  });
  const [logoError, setLogoError] = useState<string | null>(null);
  const [pendingLogoSource, setPendingLogoSource] = useState<string | null>(null);
  const [dismissedApiFields, setDismissedApiFields] = useState<Partial<Record<LeagueFormFieldName, true>>>({});

  const values = watch();
  const structure = getStructure(values);
  const logoSrc = getBase64ImageSrc(values.logoBase64);
  const trackedStats = useMemo(() => values.trackedStats ?? [], [values.trackedStats]);
  const displayedTrackedStats = useMemo(
    () => normalizeLeagueTrackedStats([...leagueTrackedStatOptions, ...trackedStats]),
    [trackedStats],
  );
  const apiFormError = mapApiErrorToForm(apiError, leagueFormApiFieldMap, leagueFormApiMessageFieldMap);
  const initialCompetitionType = initialLeague?.competitionType ?? competitionType;
  const hasExistingMatches = Boolean(initialLeague && "matchesCount" in initialLeague && initialLeague.matchesCount > 0);
  const isSensitiveConversion = mode === "edit"
    && initialCompetitionType !== "ELIMINATION"
    && values.competitionType === "ELIMINATION"
    && hasExistingMatches;
  const entityLabel = values.competitionType === "ELIMINATION"
    ? "eliminatoria"
    : values.competitionType === "GROUPS" ? "torneo" : "liga";

  useEffect(() => {
    const nextValues = toLeagueFormValues(isOpen ? initialLeague : null);
    nextValues.competitionType = competitionType;
    if (competitionType === "ELIMINATION") nextValues.finalPhaseEnabled = true;
    setLogoError(null);
    setPendingLogoSource(null);
    setDismissedApiFields({});
    reset(nextValues);
  }, [competitionType, initialLeague, isOpen, reset]);

  useEffect(() => setDismissedApiFields({}), [apiError]);

  const dismissApiFieldError = (fieldName: LeagueFormFieldName) => {
    setDismissedApiFields((current) => current[fieldName] ? current : { ...current, [fieldName]: true });
  };

  const getApiFieldError = (fieldName: LeagueFormFieldName) => (
    dismissedApiFields[fieldName] ? undefined : apiFormError.fieldErrors[fieldName]
  );

  const chooseStructure = (nextStructure: BasicCompetitionStructure) => {
    if (nextStructure === structure) {
      return;
    }

    if (nextStructure === "LEAGUE_ONLY") {
      setValue("competitionType", "LEAGUE", { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseEnabled", false, { shouldDirty: true, shouldValidate: true });
      applyPresetDefaults(setValue, "TOP_8_SINGLE_GAME");
      setValue("groupStageConfig", null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (nextStructure === "LEAGUE_PLAYOFFS") {
      setValue("competitionType", "LEAGUE", { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseEnabled", true, { shouldDirty: true, shouldValidate: true });
      applyPresetDefaults(setValue, "TOP_8_SINGLE_GAME");
      setValue("groupStageConfig", null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    if (nextStructure === "ELIMINATION") {
      setValue("competitionType", "ELIMINATION", { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseEnabled", true, { shouldDirty: true, shouldValidate: true });
      applyPresetDefaults(setValue, "TOP_8_SINGLE_GAME");
      const participantCount = Math.max(2, new Set(values.teamIds).size);
      setValue("finalPhasePreset", "CUSTOM", { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseFormat", "SINGLE_ELIMINATION", { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseQualifiedTeams", participantCount, { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseByes", 0, { shouldDirty: true, shouldValidate: true });
      setValue("finalPhasePlayInSlots", 0, { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseSeededHomeAdvantage", false, { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseReseedEachRound", false, { shouldDirty: true, shouldValidate: true });
      setValue("finalPhaseGrandFinalReset", false, { shouldDirty: true, shouldValidate: true });
      setValue("groupStageConfig", null, { shouldDirty: true, shouldValidate: true });
      return;
    }

    setValue("competitionType", "GROUPS", { shouldDirty: true, shouldValidate: true });
    setValue("finalPhaseEnabled", false, { shouldDirty: true, shouldValidate: true });
    applyPresetDefaults(setValue, "TOP_8_SINGLE_GAME");
    setValue("teamIds", [], { shouldDirty: true, shouldValidate: true });
    setValue("groupStageConfig", null, { shouldDirty: true, shouldValidate: true });
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Selecciona un archivo de imagen valido.");
      return;
    }

    try {
      setLogoError(null);
      dismissApiFieldError("logoBase64");
      setPendingLogoSource(await readImageFileAsDataUrl(file));
    } catch (error) {
      setLogoError(error instanceof Error ? error.message : "No se pudo cargar el logo.");
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={loading ? () => undefined : onClose} maxWidthClassName="max-w-4xl" hideCloseButton>
        <form className="space-y-5" onSubmit={handleSubmit((nextValues) => onSubmit(nextValues))}>
          <div className="flex items-start justify-between gap-4 px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-orange-600">
                {mode === "create" ? "Nueva competencia" : "Datos generales"}
              </p>
              <h2 className="mt-1 text-[30px] leading-none sm:text-[34px]">
                {mode === "create" ? "Crear competencia" : `Editar ${entityLabel}`}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {mode === "create"
                  ? "Define lo esencial. Configuraras equipos y reglas en una pantalla completa despues de crearla."
                  : "Actualiza solo la informacion general; las reglas viven en Configurar modo."}
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={loading} className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">Cerrar</button>
          </div>

          <section className="rounded-[28px] bg-white px-5 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:px-8">
            <div className="flex flex-col items-center">
              <label className={cn("cursor-pointer", loading && "pointer-events-none opacity-50")}>
                <span className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white text-slate-400 shadow-inner">
                  {logoSrc ? <img src={logoSrc} alt={`Logo de ${entityLabel}`} className="h-full w-full object-cover" /> : <ImagePlus size={25} />}
                </span>
                <input type="file" accept="image/*" className="sr-only" disabled={loading} onChange={handleLogoChange} />
              </label>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600">
                  <Upload size={11} /> {values.logoBase64 ? "Cambiar" : "Subir"}
                  <input type="file" accept="image/*" className="sr-only" disabled={loading} onChange={handleLogoChange} />
                </label>
                {values.logoBase64 ? (
                  <>
                    <button type="button" onClick={() => setPendingLogoSource(logoSrc)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500" title="Recortar"><Pencil size={12} /></button>
                    <button type="button" onClick={() => setValue("logoBase64", null, { shouldDirty: true, shouldValidate: true })} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500" title="Quitar"><Trash2 size={12} /></button>
                  </>
                ) : null}
              </div>
              {logoError ? <p className="mt-2 text-center text-xs text-red-600">{logoError}</p> : null}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.04fr)_minmax(280px,0.78fr)]">
              <div className="space-y-4">
                <Controller name="name" control={control} render={({ field, fieldState }) => <Input {...field} label="Nombre" placeholder="Copa Municipal 2026" leftIcon={<Trophy size={14} />} maxLength={LEAGUE_FORM_LIMITS.name} error={fieldState.error?.message ?? getApiFieldError("name")} disabled={loading} className={fieldClassName} onChange={(event) => { dismissApiFieldError("name"); field.onChange(event); }} />} />
                <Controller name="responsibleName" control={control} render={({ field, fieldState }) => <Input {...field} label="Responsable" placeholder="Nombre completo" leftIcon={<CircleUserRound size={14} />} maxLength={LEAGUE_FORM_LIMITS.responsibleName} error={fieldState.error?.message ?? getApiFieldError("responsibleName")} disabled={loading} className={fieldClassName} onChange={(event) => { dismissApiFieldError("responsibleName"); field.onChange(event); }} />} />
                <Controller name="responsibleEmail" control={control} render={({ field, fieldState }) => <Input {...field} label="Correo" type="email" placeholder="responsable@correo.com" leftIcon={<Mail size={14} />} maxLength={LEAGUE_FORM_LIMITS.responsibleEmail} error={fieldState.error?.message ?? getApiFieldError("responsibleEmail")} disabled={loading} className={fieldClassName} onChange={(event) => { dismissApiFieldError("responsibleEmail"); field.onChange(event); }} />} />
                <Controller name="category" control={control} render={({ field, fieldState }) => <Input {...field} label="Categoria" placeholder="Basquet varonil" leftIcon={<LayoutGrid size={14} />} maxLength={LEAGUE_FORM_LIMITS.category} error={fieldState.error?.message ?? getApiFieldError("category")} disabled={loading} className={fieldClassName} onChange={(event) => { dismissApiFieldError("category"); field.onChange(event); }} />} />
              </div>
              <div className="space-y-4">
                <Controller name="startDate" control={control} render={({ field, fieldState }) => <Input {...field} label="Fecha de inicio" type="date" leftIcon={<CalendarDays size={14} />} error={fieldState.error?.message ?? getApiFieldError("startDate")} disabled={loading} className={fieldClassName} />} />
                <Controller name="endDate" control={control} render={({ field, fieldState }) => <Input {...field} label="Fecha final" type="date" leftIcon={<CalendarDays size={14} />} error={fieldState.error?.message ?? getApiFieldError("endDate")} disabled={loading} className={fieldClassName} />} />
                {mode === "edit" ? <Controller name="status" control={control} render={({ field, fieldState }) => <Select {...field} label="Estatus" error={fieldState.error?.message ?? getApiFieldError("status")} disabled={loading} className={fieldClassName}><option value="Sin empezar">Sin empezar</option><option value="En curso">En curso</option><option value="Finalizada">Finalizada</option></Select>} /> : null}
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_62%,#fff7ed_100%)] p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-500 text-white shadow-[0_8px_20px_rgba(249,115,22,0.22)]">
                  <Activity size={17} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-950">Metricas de seguimiento</p>
                  <p className="mt-0.5 text-xs text-slate-500">Elige los datos que registraras en cada partido.</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-700 shadow-sm">
                {trackedStats.length} activas
              </span>
            </div>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {displayedTrackedStats.map((stat) => {
                const active = trackedStats.includes(stat);
                return (
                  <button
                    key={stat}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setValue("trackedStats", active ? trackedStats.filter((item) => item !== stat) : [...trackedStats, stat], { shouldDirty: true, shouldValidate: true })}
                    className={cn(
                      "group flex min-h-[68px] items-center justify-between gap-3 rounded-[17px] border px-3.5 py-3 text-left transition duration-200",
                      active
                        ? "border-orange-300 bg-white text-slate-950 shadow-[0_8px_20px_rgba(249,115,22,0.10)]"
                        : "border-slate-200 bg-white/70 text-slate-500 hover:border-orange-200 hover:bg-white",
                    )}
                  >
                    <span>
                      <span className="block text-sm font-bold">{stat}</span>
                      <span className={cn("mt-1 block text-[10px] font-semibold uppercase tracking-[0.08em]", active ? "text-orange-600" : "text-slate-400")}>
                        {active ? "Se registrara" : "Sin registrar"}
                      </span>
                    </span>
                    <span className={cn(
                      "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                      active
                        ? "border-orange-500 bg-orange-500 text-white shadow-[0_5px_12px_rgba(249,115,22,0.22)]"
                        : "border-slate-200 bg-slate-50 text-transparent group-hover:border-orange-200",
                    )}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff_0%,#ffffff_58%,#fff8f1_100%)] p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white"><Trophy size={17} /></span>
              <div>
                <p className="text-sm font-bold text-slate-950">Modo de competencia</p>
                <p className="text-xs text-slate-500">Aqui solo eliges la base; sus reglas se configuran despues.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ModeCard selected={structure === "LEAGUE_ONLY"} disabled={mode === "edit" && initialCompetitionType !== "LEAGUE"} icon={<LayoutGrid size={17} />} title="Solo liga" description="Temporada regular sin fase final." onClick={() => chooseStructure("LEAGUE_ONLY")} />
              <ModeCard selected={structure === "LEAGUE_PLAYOFFS"} disabled={mode === "edit" && initialCompetitionType !== "LEAGUE"} icon={<Trophy size={17} />} title="Liga + playoffs" description="Temporada regular con llave de cierre." onClick={() => chooseStructure("LEAGUE_PLAYOFFS")} />
              <ModeCard selected={structure === "ELIMINATION"} disabled={mode === "edit" && initialCompetitionType === "GROUPS"} icon={<Medal size={17} />} title="Eliminacion directa" description="Todos comienzan dentro de una llave." onClick={() => chooseStructure("ELIMINATION")} />
              <ModeCard selected={structure === "GROUPS"} disabled={mode === "edit" && initialCompetitionType !== "GROUPS"} icon={<UsersRound size={17} />} title="Torneo por grupos" description="Grupos iniciales y cierre opcional." onClick={() => chooseStructure("GROUPS")} />
            </div>
          </section>

          {isSensitiveConversion ? (
            <div className="flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <ShieldCheck size={17} className="mt-0.5 shrink-0" />
              <span><strong>Cambio sensible.</strong> Al guardar se confirmara el reinicio de los partidos y el orden de la nueva llave.</span>
            </div>
          ) : null}

          <FormErrors message={apiFormError.globalMessage} />

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Equipos, vueltas, grupos y llaves se configuran despues de guardar.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={loading || !formState.isValid}>
                {loading ? "Guardando..." : mode === "create" ? structure === "GROUPS" ? "Crear y reunir equipos" : "Crear y configurar" : "Guardar datos"}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ImageCropperModal
        isOpen={pendingLogoSource !== null}
        imageSrc={pendingLogoSource}
        title={`Ajustar logo de ${entityLabel}`}
        exportShape="circle"
        onClose={() => setPendingLogoSource(null)}
        onConfirm={(nextLogoBase64) => {
          setValue("logoBase64", nextLogoBase64, { shouldDirty: true, shouldValidate: true });
          setPendingLogoSource(null);
        }}
      />
    </>
  );
}
