import { zodResolver } from "@hookform/resolvers/zod";
import { CircleUserRound, Shield, UsersRound } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/pages/teams/components/FormErrors";
import type { ApiPlayer, TeamFormValues, TeamListItem } from "@/pages/teams/Teams.types";
import { getTeamRosterStatus } from "@/pages/teams/Teams.types";
import { teamFormSchema, toTeamFormValues } from "@/pages/teams/schemas/Teams.schema";
import { Button, Input, Modal } from "@/shared/components/ui";

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

  const selectedPlayerIds = watch("playerIds") ?? [];

  useEffect(() => {
    if (isOpen) {
      reset(toTeamFormValues(initialTeam, defaultPlayerIds));
      return;
    }

    reset(toTeamFormValues(null));
  }, [defaultPlayerIds, initialTeam, isOpen, reset]);

  const rosterStatus = useMemo(() => getTeamRosterStatus(selectedPlayerIds), [selectedPlayerIds]);

  const togglePlayer = (playerId: number) => {
    const nextPlayerIds = selectedPlayerIds.includes(playerId)
      ? selectedPlayerIds.filter((currentId) => currentId !== playerId)
      : [...selectedPlayerIds, playerId];

    setValue("playerIds", nextPlayerIds.sort((left, right) => left - right), {
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
              <p className="text-xs font-semibold text-slate-600">Jugadores</p>
              <p className="text-xs text-slate-500">Puedes dejarlo sin jugadores o asignar varios desde aqui.</p>
            </div>
            <p className="text-xs text-slate-500">
              {selectedPlayerIds.length} {selectedPlayerIds.length === 1 ? "seleccionado" : "seleccionados"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/80 p-3 sm:grid-cols-2">
            {players.length > 0 ? (
              players.map((player) => {
                const checked = selectedPlayerIds.includes(player.id);

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
