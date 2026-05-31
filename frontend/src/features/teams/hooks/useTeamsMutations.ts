import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { playersQueryKeys } from "@/features/players/Players.service";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import type { TeamFormMode, TeamFormValues } from "@/features/teams/Teams.types";
import { toTeamMutationPayload } from "@/features/teams/schemas/Teams.schema";
import { useToast } from "@/app/providers/ToastProvider";
import { getApiGlobalErrorMessage } from "@/shared/api/client";

type SaveTeamArgs = {
  mode: TeamFormMode;
  teamId?: number;
  values: TeamFormValues;
};

type SaveTeamMutationArgs = {
  mode: TeamFormMode;
  teamId?: number;
  payload: ReturnType<typeof toTeamMutationPayload>;
};

export function useTeamsMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [deletingTeamId, setDeletingTeamId] = useState<number | null>(null);

  const saveMutation = useMutation({
    mutationFn: async ({ mode, teamId, payload }: SaveTeamMutationArgs) => {
      if (mode === "create") {
        return teamsService.createTeam(payload);
      }

      if (!teamId) {
        throw new Error("No se encontro el equipo a editar.");
      }

      return teamsService.updateTeam(teamId, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: teamsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: playersQueryKeys.all });
      toast.success({
        title: variables.mode === "create" ? "Equipo creado correctamente" : "Equipo actualizado correctamente",
        description: "La accion se completo sin problemas.",
      });
    },
    onError: (error, variables) => {
      toast.error({
        title: variables.mode === "create" ? "No se pudo crear el equipo" : "No se pudo actualizar el equipo",
        description: getApiGlobalErrorMessage(error) ?? undefined,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: number) => teamsService.deleteTeam(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teamsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: playersQueryKeys.all });
      toast.success({
        title: "Equipo eliminado",
        description: "El equipo se elimino correctamente.",
      });
    },
    onError: (error) => {
      toast.error({
        title: "No se pudo eliminar el equipo",
        description: getApiGlobalErrorMessage(error) ?? undefined,
      });
    },
  });

  const clearMutationError = () => {
    saveMutation.reset();
    deleteMutation.reset();
  };

  const saveTeam = async ({ mode, teamId, values }: SaveTeamArgs) => {
    clearMutationError();
    await saveMutation.mutateAsync({
      mode,
      teamId,
      payload: toTeamMutationPayload(values),
    });
  };

  const deleteTeam = async (teamId: number) => {
    clearMutationError();
    setDeletingTeamId(teamId);

    try {
      await deleteMutation.mutateAsync(teamId);
    } finally {
      setDeletingTeamId(null);
    }
  };

  const mutationError = saveMutation.error ?? deleteMutation.error;
  const mutationErrorMessage = useMemo(
    () => (mutationError ? getApiGlobalErrorMessage(mutationError) : null),
    [mutationError],
  );

  return {
    submitting: saveMutation.isPending,
    deletingTeamId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveTeam,
    deleteTeam,
  };
}

