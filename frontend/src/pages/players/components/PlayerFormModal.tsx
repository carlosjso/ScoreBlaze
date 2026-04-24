import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, Mail, Phone, Shield } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/pages/players/components/FormErrors";
import { getPlayerStatus, type ApiTeam, type PlayerFormValues, type PlayerListItem } from "@/pages/players/Players.types";
import { playerFormSchema, toPlayerFormValues } from "@/pages/players/schemas/Players.schema";
import { Button, Input, Modal } from "@/shared/components/ui";

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

  const selectedTeamIds = watch("teamIds") ?? [];

  useEffect(() => {
    if (isOpen) {
      reset(toPlayerFormValues(initialPlayer, defaultTeamIds));
      return;
    }

    reset(toPlayerFormValues(null));
  }, [defaultTeamIds, initialPlayer, isOpen, reset]);

  const status = useMemo(() => getPlayerStatus(selectedTeamIds), [selectedTeamIds]);

  const toggleTeam = (teamId: number) => {
    const nextTeamIds = selectedTeamIds.includes(teamId)
      ? selectedTeamIds.filter((currentId) => currentId !== teamId)
      : [...selectedTeamIds, teamId];

    setValue(
      "teamIds",
      nextTeamIds.sort((left, right) => left - right),
      { shouldDirty: true, shouldValidate: true }
    );
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
              <p className="text-xs font-semibold text-slate-600">Equipos</p>
              <p className="text-xs text-slate-500">Puedes dejarlo sin equipo o asignarlo a varios.</p>
            </div>
            <p className="text-xs text-slate-500">
              {selectedTeamIds.length} {selectedTeamIds.length === 1 ? "seleccionado" : "seleccionados"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:grid-cols-2">
            {teams.length > 0 ? (
              teams.map((team) => {
                const checked = selectedTeamIds.includes(team.id);
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
