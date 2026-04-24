import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock3, MapPin, Shield, Trophy } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/pages/quick-matches/components/FormErrors";
import {
  getMatchResultOptionLabel,
  type ApiTeamOption,
  type MatchResultOption,
  type QuickMatchFormValues,
  type QuickMatchListItem,
} from "@/pages/quick-matches/QuickMatches.types";
import { quickMatchFormSchema, toQuickMatchFormValues } from "@/pages/quick-matches/schemas/QuickMatches.schema";
import { Button, Input, Modal, Select } from "@/shared/components/ui";

type QuickMatchFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialMatch?: QuickMatchListItem | null;
  teams: ApiTeamOption[];
  loading?: boolean;
  apiError?: string | null;
  onClose: () => void;
  onSubmit: (values: QuickMatchFormValues) => Promise<void> | void;
};

function getComputedResultOption(scoreTeamA: string, scoreTeamB: string): MatchResultOption | null {
  const normalizedScoreTeamA = scoreTeamA.trim();
  const normalizedScoreTeamB = scoreTeamB.trim();

  if (!/^\d+$/.test(normalizedScoreTeamA) || !/^\d+$/.test(normalizedScoreTeamB)) {
    return null;
  }

  const parsedScoreTeamA = Number(normalizedScoreTeamA);
  const parsedScoreTeamB = Number(normalizedScoreTeamB);

  if (parsedScoreTeamA === parsedScoreTeamB) {
    return "draw";
  }

  return parsedScoreTeamA > parsedScoreTeamB ? "team_a" : "team_b";
}

export function QuickMatchFormModal({
  isOpen,
  mode,
  initialMatch,
  teams,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: QuickMatchFormModalProps) {
  const { control, handleSubmit, reset, watch } = useForm<QuickMatchFormValues>({
    resolver: zodResolver(quickMatchFormSchema),
    defaultValues: toQuickMatchFormValues(null, teams),
  });

  const teamAId = watch("teamAId");
  const teamBId = watch("teamBId");
  const scoreTeamA = watch("scoreTeamA") ?? "";
  const scoreTeamB = watch("scoreTeamB") ?? "";

  useEffect(() => {
    if (isOpen) {
      reset(toQuickMatchFormValues(initialMatch, teams));
      return;
    }

    reset(toQuickMatchFormValues(null, teams));
  }, [initialMatch, isOpen, reset, teams]);

  const teamAName = useMemo(
    () => teams.find((team) => team.id === teamAId)?.name ?? "Equipo A",
    [teamAId, teams]
  );
  const teamBName = useMemo(
    () => teams.find((team) => team.id === teamBId)?.name ?? "Equipo B",
    [teamBId, teams]
  );
  const computedResult = useMemo(() => getComputedResultOption(scoreTeamA, scoreTeamB), [scoreTeamA, scoreTeamB]);
  const resultHint = computedResult
    ? `El resultado se calcula automaticamente: ${getMatchResultOptionLabel(computedResult, teamAName, teamBName)}.`
    : "Si dejas el marcador vacio, puedes definir el resultado manualmente.";

  const submitForm = async (values: QuickMatchFormValues) => {
    await onSubmit(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title={mode === "create" ? "Crear partido rapido" : "Editar partido rapido"}
      maxWidthClassName="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="teamAId"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                label="Equipo local"
                value={String(field.value)}
                onChange={(event) => field.onChange(Number(event.target.value))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                disabled={loading}
              >
                {teams.length === 0 ? <option value="0">No hay equipos disponibles</option> : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            )}
          />

          <Controller
            name="teamBId"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                label="Equipo visitante"
                value={String(field.value)}
                onChange={(event) => field.onChange(Number(event.target.value))}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                disabled={loading}
              >
                {teams.length === 0 ? <option value="0">No hay equipos disponibles</option> : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </Select>
            )}
          />

          <Controller
            name="matchDate"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Fecha"
                type="date"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<CalendarDays size={14} />}
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                label="Estatus"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                disabled={loading}
              >
                <option value="scheduled">Programado</option>
                <option value="live">En juego</option>
                <option value="finished">Finalizado</option>
              </Select>
            )}
          />

          <Controller
            name="startTime"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Hora de inicio"
                type="time"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Clock3 size={14} />}
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="endTime"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Hora de fin"
                type="time"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Clock3 size={14} />}
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="scoreTeamA"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label={`Marcador ${teamAName}`}
                type="number"
                min={0}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Trophy size={14} />}
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="scoreTeamB"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label={`Marcador ${teamBName}`}
                type="number"
                min={0}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Trophy size={14} />}
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="result"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                label="Resultado"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                hint={resultHint}
                disabled={loading || computedResult !== null}
                containerClassName="sm:col-span-2"
              >
                <option value="pending">{getMatchResultOptionLabel("pending", teamAName, teamBName)}</option>
                <option value="draw">{getMatchResultOptionLabel("draw", teamAName, teamBName)}</option>
                <option value="team_a">{getMatchResultOptionLabel("team_a", teamAName, teamBName)}</option>
                <option value="team_b">{getMatchResultOptionLabel("team_b", teamAName, teamBName)}</option>
              </Select>
            )}
          />

          <Controller
            name="court"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Cancha"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<MapPin size={14} />}
                placeholder="Cancha central"
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="tournament"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Torneo"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                leftIcon={<Shield size={14} />}
                placeholder="Torneo relampago"
                error={fieldState.error?.message}
                disabled={loading}
              />
            )}
          />
        </div>

        {teamAId > 0 && teamAId === teamBId ? (
          <p className="text-xs font-semibold text-rose-600">
            El equipo local y visitante no pueden ser el mismo.
          </p>
        ) : null}

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
