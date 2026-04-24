import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { teamsQueryKeys, teamsService } from "@/pages/teams/Teams.service";
import type { TeamFormMode, TeamFormValues } from "@/pages/teams/Teams.types";
import { toTeamMutationPayload } from "@/pages/teams/schemas/Teams.schema";

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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsQueryKeys.snapshot() }),
  });

  const deleteMutation = useMutation({
    mutationFn: (teamId: number) => teamsService.deleteTeam(teamId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: teamsQueryKeys.snapshot() }),
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

  const mutationError = useMemo(() => {
    const error = saveMutation.error ?? deleteMutation.error;
    return error instanceof Error ? error.message : null;
  }, [deleteMutation.error, saveMutation.error]);

  return {
    submitting: saveMutation.isPending,
    deletingTeamId,
    mutationError,
    clearMutationError,
    saveTeam,
    deleteTeam,
  };
}
