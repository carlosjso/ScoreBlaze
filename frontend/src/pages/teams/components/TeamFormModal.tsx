import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, ImagePlus, Shield, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/pages/teams/components/FormErrors";
import { TeamLogo } from "@/pages/teams/components/TeamLogo";
import type { ApiPlayer, TeamFormValues, TeamListItem } from "@/pages/teams/Teams.types";
import { imageFileToPngBase64 } from "@/pages/teams/Teams.utils";
import { getTeamRosterStatus } from "@/pages/teams/Teams.types";
import { teamFormSchema, toTeamFormValues } from "@/pages/teams/schemas/Teams.schema";
import { Button, Input, Modal } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type TeamFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialTeam?: TeamListItem | null;
  players: ApiPlayer[];
  defaultPlayerIds: number[];
  loading?: boolean;
  apiError?: string | null;
  onClose: () => void;
  onSubmit: (values: TeamFormValues) => Promise<void> | void;
};

export function TeamFormModal({
  isOpen,
  mode,
  initialTeam,
  players,
  defaultPlayerIds,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: TeamFormModalProps) {
  const { control, handleSubmit, reset, setValue, watch } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: toTeamFormValues(null),
  });
  const [logoError, setLogoError] = useState<string | null>(null);

  const selectedPlayerIds = watch("playerIds");
  const teamName = watch("name") ?? "";
  const logoBase64 = watch("logoBase64");

  useEffect(() => {
    if (isOpen) {
      setLogoError(null);
      reset(toTeamFormValues(initialTeam, defaultPlayerIds));
      return;
    }

    setLogoError(null);
    reset(toTeamFormValues(null));
  }, [defaultPlayerIds, initialTeam, isOpen, reset]);

  const normalizedSelectedPlayerIds = useMemo(() => selectedPlayerIds ?? [], [selectedPlayerIds]);
  const rosterStatus = useMemo(() => getTeamRosterStatus(normalizedSelectedPlayerIds), [normalizedSelectedPlayerIds]);

  const togglePlayer = (playerId: number) => {
    const nextPlayerIds = normalizedSelectedPlayerIds.includes(playerId)
      ? normalizedSelectedPlayerIds.filter((currentId) => currentId !== playerId)
      : [...normalizedSelectedPlayerIds, playerId];

    setValue("playerIds", nextPlayerIds.sort((left, right) => left - right), {
      shouldDirty: true,
      shouldValidate: true,
    });
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
    setValue("logoBase64", null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submitForm = async (values: TeamFormValues) => {
    await onSubmit(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title={mode === "create" ? "Crear equipo" : "Editar equipo"}
      maxWidthClassName="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Nombre del equipo"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<CircleUserRound size={14} />}
                placeholder="Plateneros"
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />
          <Input label="Plantilla" value={rosterStatus} disabled leftIcon={<Shield size={14} />} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Logo</p>
              <p className="text-xs text-slate-500">Opcional. Si subes una imagen la convertimos a PNG para guardarla.</p>
            </div>
            {logoBase64 ? (
              <button
                type="button"
                onClick={clearLogo}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={12} />
                Quitar logo
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:flex-row sm:items-center">
            <TeamLogo
              name={teamName || "Equipo"}
              logoBase64={logoBase64}
              className="h-24 w-24 shrink-0 rounded-2xl text-sm text-slate-600"
              imageClassName="p-3"
              emptyClassName="border-slate-200 bg-slate-50 text-slate-600"
            />

            <div className="min-w-0 flex-1">
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100",
                  loading && "pointer-events-none opacity-50"
                )}
              >
                <ImagePlus size={16} />
                Seleccionar logo
                <input type="file" accept="image/*" className="sr-only" disabled={loading} onChange={handleLogoChange} />
              </label>
              <p className="mt-2 text-xs text-slate-500">Puedes dejar este campo vacio. Formatos permitidos: imagenes comunes.</p>
              {logoError ? <p className="mt-1 text-xs font-medium text-red-600">{logoError}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Jugadores</p>
              <p className="text-xs text-slate-500">Puedes dejarlo sin jugadores o asignar varios desde aqui.</p>
            </div>
            <p className="text-xs text-slate-500">
              {normalizedSelectedPlayerIds.length} {normalizedSelectedPlayerIds.length === 1 ? "seleccionado" : "seleccionados"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:grid-cols-2">
            {players.length > 0 ? (
              players.map((player) => {
                const checked = normalizedSelectedPlayerIds.includes(player.id);

                return (
                  <label
                    key={player.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePlayer(player.id)}
                      disabled={loading}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-800">{player.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        <UsersRound size={12} className="mr-1 inline" />
                        {player.email}
                      </span>
                    </span>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 sm:col-span-2">No hay jugadores disponibles para asignar.</p>
            )}
          </div>
        </div>

        <FormErrors message={apiError} />

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="secondary" type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
