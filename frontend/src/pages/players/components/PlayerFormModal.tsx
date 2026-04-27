import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, ImagePlus, Mail, Phone, Shield, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/pages/players/components/FormErrors";
import { PlayerPhoto } from "@/pages/players/components/PlayerPhoto";
import { getPlayerStatus, type ApiTeam, type PlayerFormValues, type PlayerListItem } from "@/pages/players/Players.types";
import { playerFormSchema, toPlayerFormValues } from "@/pages/players/schemas/Players.schema";
import { Button, Input, Modal } from "@/shared/components/ui";
import { imageFileToPngBase64 } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type PlayerFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialPlayer?: PlayerListItem | null;
  teams: ApiTeam[];
  defaultTeamIds: number[];
  loading?: boolean;
  apiError?: string | null;
  onClose: () => void;
  onSubmit: (values: PlayerFormValues) => Promise<void> | void;
};

export function PlayerFormModal({
  isOpen,
  mode,
  initialPlayer,
  teams,
  defaultTeamIds,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: PlayerFormModalProps) {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<PlayerFormValues>({
    resolver: zodResolver(playerFormSchema),
    defaultValues: toPlayerFormValues(null),
  });
  const [photoError, setPhotoError] = useState<string | null>(null);

  const selectedTeamIds = watch("teamIds");
  const playerName = watch("name") ?? "";
  const photoBase64 = watch("photoBase64");

  useEffect(() => {
    if (isOpen) {
      setPhotoError(null);
      reset(toPlayerFormValues(initialPlayer, defaultTeamIds));
      return;
    }

    setPhotoError(null);
    reset(toPlayerFormValues(null));
  }, [defaultTeamIds, initialPlayer, isOpen, reset]);

  const normalizedSelectedTeamIds = useMemo(() => selectedTeamIds ?? [], [selectedTeamIds]);
  const status = useMemo(() => getPlayerStatus(normalizedSelectedTeamIds), [normalizedSelectedTeamIds]);

  const toggleTeam = (teamId: number) => {
    const nextTeamIds = normalizedSelectedTeamIds.includes(teamId)
      ? normalizedSelectedTeamIds.filter((currentId) => currentId !== teamId)
      : [...normalizedSelectedTeamIds, teamId];

    setValue(
      "teamIds",
      nextTeamIds.sort((left, right) => left - right),
      { shouldDirty: true, shouldValidate: true }
    );
  };

  const handlePhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setPhotoError("Selecciona un archivo de imagen valido.");
      return;
    }

    setPhotoError(null);

    try {
      const nextPhotoBase64 = await imageFileToPngBase64(file);
      setValue("photoBase64", nextPhotoBase64, {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "No se pudo cargar la foto.");
    }
  };

  const clearPhoto = () => {
    setPhotoError(null);
    setValue("photoBase64", null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submitForm = async (values: PlayerFormValues) => {
    await onSubmit(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title={mode === "create" ? "Crear jugador" : "Editar jugador"}
      maxWidthClassName="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Nombre"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<CircleUserRound size={14} />}
                placeholder="Ivan Perez"
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Telefono"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Phone size={14} />}
                placeholder="7717777344"
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />
          <Controller
            name="email"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Correo"
                type="email"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Mail size={14} />}
                placeholder="ivan@email.com"
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />
          <Input label="Estatus" value={status} disabled leftIcon={<Shield size={14} />} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Foto</p>
              <p className="text-xs text-slate-500">Opcional. Puedes subir una foto del jugador y cambiarla despues.</p>
            </div>
            {photoBase64 ? (
              <button
                type="button"
                onClick={clearPhoto}
                disabled={loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={12} />
                Quitar foto
              </button>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:flex-row sm:items-center">
            <PlayerPhoto
              name={playerName || "Jugador"}
              photoBase64={photoBase64}
              className="h-24 w-24 shrink-0 text-sm"
              emptyClassName="text-slate-600"
            />

            <div className="min-w-0 flex-1">
              <label
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100",
                  loading && "pointer-events-none opacity-50"
                )}
              >
                <ImagePlus size={16} />
                Seleccionar foto
                <input type="file" accept="image/*" className="sr-only" disabled={loading} onChange={handlePhotoChange} />
              </label>
              <p className="mt-2 text-xs text-slate-500">Este campo no es obligatorio. La foto se guarda en formato PNG.</p>
              {photoError ? <p className="mt-1 text-xs font-medium text-red-600">{photoError}</p> : null}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-600">Equipos</p>
              <p className="text-xs text-slate-500">Puedes dejarlo sin equipo o asignarlo a varios.</p>
            </div>
            <p className="text-xs text-slate-500">
              {normalizedSelectedTeamIds.length} {normalizedSelectedTeamIds.length === 1 ? "seleccionado" : "seleccionados"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:grid-cols-2">
            {teams.length > 0 ? (
              teams.map((team) => {
                const checked = normalizedSelectedTeamIds.includes(team.id);
                return (
                  <label
                    key={team.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTeam(team.id)}
                      disabled={loading}
                    />
                    <span>{team.name}</span>
                  </label>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 sm:col-span-2">No hay equipos disponibles para asignar.</p>
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
