import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, Mail, Pencil, Phone, Shield, Trash2, Upload } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/features/players/components/FormErrors";
import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import { getPlayerStatus, type PlayerFormValues, type PlayerListItem } from "@/features/players/Players.types";
import {
  PLAYER_FORM_LIMITS,
  playerFormApiFieldMap,
  playerFormApiMessageFieldMap,
  playerFormSchema,
  toPlayerFormValues,
} from "@/features/players/schemas/Players.schema";
import { mapApiErrorToForm } from "@/shared/api/client";
import { Button, ImageCropperModal, Input, Modal } from "@/shared/components/ui";
import { getBase64ImageSrc, readImageFileAsDataUrl } from "@/shared/utils/base64Image";
import { cn } from "@/shared/utils/cn";

type PlayerFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialPlayer?: PlayerListItem | null;
  loading?: boolean;
  apiError?: unknown;
  onClose: () => void;
  onSubmit: (values: PlayerFormValues) => Promise<void> | void;
};

type PlayerFormFieldName = Extract<keyof PlayerFormValues, string>;

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
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toPlayerFormValues(null),
  });
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [pendingPhotoSource, setPendingPhotoSource] = useState<string | null>(null);
  const [dismissedApiFields, setDismissedApiFields] = useState<Partial<Record<PlayerFormFieldName, true>>>({});

  const selectedTeamIds = watch("teamIds");
  const playerName = watch("name") ?? "";
  const photoBase64 = watch("photoBase64");
  const apiFormError = mapApiErrorToForm(apiError, playerFormApiFieldMap, playerFormApiMessageFieldMap);

  useEffect(() => {
    if (isOpen) {
      setPhotoError(null);
      setPendingPhotoSource(null);
      setDismissedApiFields({});
      reset(toPlayerFormValues(initialPlayer));
      return;
    }

    setPhotoError(null);
    setPendingPhotoSource(null);
    setDismissedApiFields({});
    reset(toPlayerFormValues(null));
  }, [initialPlayer, isOpen, reset]);

  useEffect(() => {
    setDismissedApiFields({});
  }, [apiError]);

  const normalizedSelectedTeamIds = useMemo(() => selectedTeamIds ?? [], [selectedTeamIds]);
  const status = useMemo(() => getPlayerStatus(normalizedSelectedTeamIds), [normalizedSelectedTeamIds]);

  const dismissApiFieldError = (fieldName: PlayerFormFieldName) => {
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

  const getApiFieldError = (fieldName: PlayerFormFieldName) => {
    if (dismissedApiFields[fieldName]) {
      return undefined;
    }

    return apiFormError.fieldErrors[fieldName];
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
    dismissApiFieldError("photoBase64");

    try {
      const nextPhotoSource = await readImageFileAsDataUrl(file);
      setPendingPhotoSource(nextPhotoSource);
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "No se pudo cargar la foto.");
    }
  };

  const clearPhoto = () => {
    setPhotoError(null);
    dismissApiFieldError("photoBase64");
    setValue("photoBase64", null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const reopenPhotoEditor = () => {
    const currentPhotoSource = getBase64ImageSrc(photoBase64);
    if (!currentPhotoSource) {
      return;
    }

    setPhotoError(null);
    dismissApiFieldError("photoBase64");
    setPendingPhotoSource(currentPhotoSource);
  };

  const submitForm = async (values: PlayerFormValues) => {
    await onSubmit(values);
  };

  return (
    <>
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
                    <>
                      <button
                        type="button"
                        onClick={reopenPhotoEditor}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={12} />
                        Editar foto
                      </button>

                      <button
                        type="button"
                        onClick={clearPhoto}
                        disabled={loading}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Trash2 size={12} />
                        Quitar
                      </button>
                    </>
                  ) : null}
                </div>

                {photoError ? (
                  <p className="mt-2 text-center text-xs font-medium text-red-600">
                    {photoError}
                  </p>
                ) : getApiFieldError("photoBase64") ? (
                  <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700">
                    {getApiFieldError("photoBase64")}
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
                      onChange={(event) => {
                        dismissApiFieldError("name");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      leftIcon={<CircleUserRound size={14} />}
                      placeholder="Ivan Perez"
                      maxLength={PLAYER_FORM_LIMITS.name}
                      error={fieldState.error?.message ?? getApiFieldError("name")}
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
                      onChange={(event) => {
                        dismissApiFieldError("phone");
                        field.onChange(event.target.value.replace(/\D/g, "").slice(0, PLAYER_FORM_LIMITS.phone));
                      }}
                      onBlur={field.onBlur}
                      leftIcon={<Phone size={14} />}
                      placeholder="7717777344"
                      maxLength={PLAYER_FORM_LIMITS.phone}
                      inputMode="numeric"
                      error={fieldState.error?.message ?? getApiFieldError("phone")}
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
                      onChange={(event) => {
                        dismissApiFieldError("email");
                        field.onChange(event);
                      }}
                      onBlur={field.onBlur}
                      leftIcon={<Mail size={14} />}
                      placeholder="ivan@email.com"
                      maxLength={PLAYER_FORM_LIMITS.email}
                      error={fieldState.error?.message ?? getApiFieldError("email")}
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

          <FormErrors message={apiFormError.globalMessage} />

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

      <ImageCropperModal
        isOpen={pendingPhotoSource !== null}
        imageSrc={pendingPhotoSource}
        title="Ajustar foto"
        onClose={() => setPendingPhotoSource(null)}
        onConfirm={(nextPhotoBase64) => {
          setValue("photoBase64", nextPhotoBase64, {
            shouldDirty: true,
            shouldValidate: true,
          });
          setPendingPhotoSource(null);
        }}
      />
    </>
  );
}

