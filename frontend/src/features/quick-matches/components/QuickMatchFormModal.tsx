import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Clock3, MapPin, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormErrors } from "@/features/quick-matches/components/FormErrors";
import {
  type ApiTeamOption,
  type QuickMatchFormValues,
  type QuickMatchListItem,
} from "@/features/quick-matches/QuickMatches.types";
import {
  QUICK_MATCH_FORM_LIMITS,
  quickMatchFormApiFieldMap,
  quickMatchFormApiMessageFieldMap,
  quickMatchFormSchema,
  toQuickMatchFormValues,
} from "@/features/quick-matches/schemas/QuickMatches.schema";
import { mapApiErrorToForm } from "@/shared/api/client";
import { Button, DatePicker, Input, Modal, Select, TimePicker } from "@/shared/components/ui";

type QuickMatchFormModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialMatch?: QuickMatchListItem | null;
  teams: ApiTeamOption[];
  title?: string;
  loading?: boolean;
  apiError?: unknown;
  onClose: () => void;
  onSubmit: (values: QuickMatchFormValues) => Promise<void> | void;
};

type QuickMatchFormFieldName = Extract<keyof QuickMatchFormValues, string>;

export function QuickMatchFormModal({
  isOpen,
  mode,
  initialMatch,
  teams,
  title,
  loading = false,
  apiError,
  onClose,
  onSubmit,
}: QuickMatchFormModalProps) {
  const { control, handleSubmit, register, reset, trigger } = useForm<QuickMatchFormValues>({
    resolver: zodResolver(quickMatchFormSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toQuickMatchFormValues(null, teams),
  });
  const [dismissedApiFields, setDismissedApiFields] = useState<
    Partial<Record<QuickMatchFormFieldName, true>>
  >({});
  const apiFormError = mapApiErrorToForm(
    apiError,
    quickMatchFormApiFieldMap,
    quickMatchFormApiMessageFieldMap,
  );

  useEffect(() => {
    if (isOpen) {
      setDismissedApiFields({});
      reset(toQuickMatchFormValues(initialMatch, teams));
      return;
    }

    setDismissedApiFields({});
    reset(toQuickMatchFormValues(null, teams));
  }, [initialMatch, isOpen, reset, teams]);

  useEffect(() => {
    setDismissedApiFields({});
  }, [apiError]);

  const dismissApiFieldError = (fieldName: QuickMatchFormFieldName) => {
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

  const getApiFieldError = (fieldName: QuickMatchFormFieldName) => {
    if (dismissedApiFields[fieldName]) {
      return undefined;
    }

    return apiFormError.fieldErrors[fieldName];
  };

  const submitForm = async (values: QuickMatchFormValues) => {
    await onSubmit(values);
  };

  const revalidateTimeFields = () => {
    void trigger(["startTime", "endTime"]);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={loading ? () => undefined : onClose}
      title={title ?? (mode === "create" ? "Crear partido rapido" : "Editar partido rapido")}
      maxWidthClassName="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={handleSubmit(submitForm)}>
        <input type="hidden" {...register("scoreTeamA")} />
        <input type="hidden" {...register("scoreTeamB")} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Controller
            name="teamAId"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                label="Equipo local"
                value={String(field.value)}
                onChange={(event) => {
                  dismissApiFieldError("teamAId");
                  field.onChange(Number(event.target.value));
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message ?? getApiFieldError("teamAId")}
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
                onChange={(event) => {
                  dismissApiFieldError("teamBId");
                  field.onChange(Number(event.target.value));
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message ?? getApiFieldError("teamBId")}
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
              <DatePicker
                label="Fecha"
                value={field.value}
                onChange={(nextValue) => {
                  dismissApiFieldError("matchDate");
                  field.onChange(nextValue);
                }}
                onBlur={field.onBlur}
                leftIcon={<CalendarDays size={14} />}
                error={fieldState.error?.message ?? getApiFieldError("matchDate")}
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
                onChange={(event) => {
                  dismissApiFieldError("status");
                  field.onChange(event);
                }}
                onBlur={field.onBlur}
                error={fieldState.error?.message ?? getApiFieldError("status")}
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
              <TimePicker
                label="Hora de inicio"
                value={field.value}
                onChange={(nextValue) => {
                  dismissApiFieldError("startTime");
                  field.onChange(nextValue);
                  revalidateTimeFields();
                }}
                onBlur={field.onBlur}
                leftIcon={<Clock3 size={14} />}
                error={fieldState.error?.message ?? getApiFieldError("startTime")}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="endTime"
            control={control}
            render={({ field, fieldState }) => (
              <TimePicker
                label="Hora de fin"
                value={field.value}
                onChange={(nextValue) => {
                  dismissApiFieldError("endTime");
                  field.onChange(nextValue);
                  revalidateTimeFields();
                }}
                onBlur={field.onBlur}
                leftIcon={<Clock3 size={14} />}
                error={fieldState.error?.message ?? getApiFieldError("endTime")}
                disabled={loading}
              />
            )}
          />

          <Controller
            name="court"
            control={control}
            render={({ field, fieldState }) => (
              <Input
                label="Cancha"
                value={field.value}
                onChange={(event) => {
                  dismissApiFieldError("court");
                  field.onChange(event);
                }}
                onBlur={field.onBlur}
                leftIcon={<MapPin size={14} />}
                placeholder="Cancha central"
                maxLength={QUICK_MATCH_FORM_LIMITS.court}
                error={fieldState.error?.message ?? getApiFieldError("court")}
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
                onChange={(event) => {
                  dismissApiFieldError("tournament");
                  field.onChange(event);
                }}
                onBlur={field.onBlur}
                leftIcon={<Shield size={14} />}
                placeholder="Torneo relampago"
                maxLength={QUICK_MATCH_FORM_LIMITS.tournament}
                error={fieldState.error?.message ?? getApiFieldError("tournament")}
                disabled={loading}
              />
            )}
          />
        </div>

        <FormErrors message={apiFormError.globalMessage} />

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

