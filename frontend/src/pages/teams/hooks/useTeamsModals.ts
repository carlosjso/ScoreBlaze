import { useState } from "react";

import type { TeamFormMode, TeamListItem } from "@/pages/teams/Teams.types";

export function useTeamsModals() {
  const [detailTeam, setDetailTeam] = useState<TeamListItem | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<TeamListItem | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamListItem | null>(null);
  const [defaultPlayerIds, setDefaultPlayerIds] = useState<number[]>([]);
  const [formMode, setFormMode] = useState<TeamFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingTeam(null);
    setDefaultPlayerIds([]);
  };

  return {
    detailTeam,
    deleteTeam,
    editingTeam,
    defaultPlayerIds,
    formMode,
    formOpen,
    openDetail: setDetailTeam,
    closeDetail: () => setDetailTeam(null),
    requestDelete: setDeleteTeam,
    clearDeleteRequest: () => setDeleteTeam(null),
    openCreate(playerIds: number[] = []) {
      setFormMode("create");
      setEditingTeam(null);
      setDefaultPlayerIds(playerIds);
      setFormOpen(true);
    },
    openEdit(team: TeamListItem) {
      setFormMode("edit");
      setEditingTeam(team);
      setDefaultPlayerIds(team.playerIds);
      setFormOpen(true);
    },
    closeForm,
  };
}
