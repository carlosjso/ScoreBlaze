import type { ChangeEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CircleUserRound,
  Mail,
  Phone,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/pages/teams/components/FormErrors";
import { TeamLogo } from "@/pages/teams/components/TeamLogo";
import type { TeamFormValues, TeamListItem } from "@/pages/teams/Teams.types";
import { imageFileToPngBase64 } from "@/pages/teams/Teams.utils";
import { teamFormSchema, toTeamFormValues } from "@/pages/teams/schemas/Teams.schema";
import { Button, Input, Modal } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type TeamFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialTeam?: TeamListItem | null;
  loading?: boolean;
  apiError?: string | null;
  onClose: () => void;
  onSubmit: (values: TeamFormValues) => Promise<void> | void;
};

export function TeamFormModal({
  isOpen,
  mode,
  initialTeam,
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

  const teamName = watch("name") ?? "";
  const logoBase64 = watch("logoBase64");

  useEffect(() => {
    if (isOpen) {
      setLogoError(null);
      reset(toTeamFormValues(initialTeam));
      return;
    }

    setLogoError(null);
    reset(toTeamFormValues(null));
  }, [initialTeam, isOpen, reset]);

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
                  loading && "pointer-events-none opacity-50",
                )}
              >
                <span className="sr-only">Seleccionar logo</span>
                <TeamLogo
                  name={teamName || "Logo"}
                  logoBase64={logoBase64}
                  className="h-24 w-24 rounded-full text-sm"
                  imageClassName="p-2"
                  emptyClassName="border-slate-200 bg-slate-200 text-slate-700"
                />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={loading}
                  onChange={handleLogoChange}
                />
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
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={loading}
                    onChange={handleLogoChange}
                  />
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
                <p className="mt-2 text-center text-xs font-medium text-red-600">
                  {logoError}
                </p>
              ) : null}
            </div>

            <div className="mt-6 space-y-4">
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
                    placeholder="Plataneros"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
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
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    leftIcon={<CircleUserRound size={14} />}
                    placeholder="Platano Alvarado"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
                  />
                )}
              />

              <Controller
                name="responsiblePhone"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Telefono del responsable"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    leftIcon={<Phone size={14} />}
                    placeholder="7711777344"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
                  />
                )}
              />

              <Controller
                name="responsibleEmail"
                control={control}
                render={({ field, fieldState }) => (
                  <Input
                    label="Correo del responsable"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    leftIcon={<Mail size={14} />}
                    placeholder="siamel3803@gmail.com"
                    error={fieldState.error?.message}
                    disabled={loading}
                    className="bg-slate-100"
                  />
                )}
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
