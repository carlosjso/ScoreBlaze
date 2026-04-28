import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, Mail, Phone, Shield, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/features/players/components/FormErrors";
import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import { getPlayerStatus, type PlayerFormValues, type PlayerListItem } from "@/features/players/Players.types";
import { playerFormSchema, toPlayerFormValues } from "@/features/players/schemas/Players.schema";
import { Button, Input, Modal } from "@/shared/components/ui";
import { imageFileToPngBase64 } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type PlayerFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialPlayer?: PlayerListItem | null;
  loading?: boolean;
  apiError?: string | null;
  onClose: () => void;
  onSubmit: (values: PlayerFormValues) => Promise<void> | void;
};

export function PlayerFormModal({
  isOpen,
  mode,
  initialPlayer,
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
      reset(toPlayerFormValues(initialPlayer));
      return;
    }

    setPhotoError(null);
    reset(toPlayerFormValues(null));
  }, [initialPlayer, isOpen, reset]);

  const normalizedSelectedTeamIds = useMemo(() => selectedTeamIds ?? [], [selectedTeamIds]);
  const status = useMemo(() => getPlayerStatus(normalizedSelectedTeamIds), [normalizedSelectedTeamIds]);

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
      maxWidthClassName="max-w-xl"
      hideCloseButton
    >
      <form className="space-y-5" onSubmit={handleSubmit(submitForm)}>
        <div className="mx-auto max-w-[440px] rounded-[28px] bg-white px-5 py-7 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:px-8">
          <div className="mx-auto max-w-[360px]">
            <div className="flex flex-col items-center">
              <label
                className={cn(
                  "relative inline-flex cursor-pointer flex-col items-center gap-2",
                  loading && "pointer-events-none opacity-50"
                )}
              >
                <span className="sr-only">Seleccionar foto</span>
                <PlayerPhoto
                  name={playerName || "Jugador"}
                  photoBase64={photoBase64}
                  className="h-24 w-24 text-sm"
                  emptyClassName="border-slate-200 bg-slate-200 text-slate-700"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={loading}
                  onChange={handlePhotoChange}
                />
              </label>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <label
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100",
                    loading && "pointer-events-none opacity-50"
                  )}
                >
                  <Upload size={12} />
                  {photoBase64 ? "Cambiar foto" : "Subir foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={loading}
                    onChange={handlePhotoChange}
                  />
                </label>

                {photoBase64 ? (
                  <button
                    type="button"
                    onClick={clearPhoto}
                    disabled={loading}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={12} />
                    Quitar
                  </button>
                ) : null}
              </div>

              {photoError ? (
                <p className="mt-2 text-center text-xs font-medium text-red-600">
                  {photoError}
                </p>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Nombre del jugador"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    leftIcon={<CircleUserRound size={14} />}
                    placeholder="Ivan Perez"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Telefono del jugador"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    leftIcon={<Phone size={14} />}
                    placeholder="7717777344"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
                  />
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Correo del jugador"
                    type="email"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    leftIcon={<Mail size={14} />}
                    placeholder="ivan@email.com"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
                  />
                )}
              />

              <Input
                label="Estatus"
                value={status}
                disabled
                leftIcon={<Shield size={14} />}
                className="bg-slate-100"
              />
            </div>
          </div>
        </div>

        <FormErrors message={apiError} />

        <div className="flex justify-end">
          <Button variant="secondary" type="submit" disabled={loading}>
            {loading
              ? "Guardando..."
              : mode === "create"
                ? "Crear"
                : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

