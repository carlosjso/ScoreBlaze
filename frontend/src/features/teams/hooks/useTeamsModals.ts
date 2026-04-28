import { useState } from "react";

import type { TeamFormMode, TeamListItem } from "@/features/teams/Teams.types";

export function useTeamsModals() {
  const [detailTeam, setDetailTeam] = useState<TeamListItem | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<TeamListItem | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamListItem | null>(null);
  const [formMode, setFormMode] = useState<TeamFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingTeam(null);
  };

  return {
    detailTeam,
    deleteTeam,
    editingTeam,
    formMode,
    formOpen,
    openDetail: setDetailTeam,
    closeDetail: () => setDetailTeam(null),
    requestDelete: setDeleteTeam,
    clearDeleteRequest: () => setDeleteTeam(null),
    openCreate() {
      setFormMode("create");
      setEditingTeam(null);
      setFormOpen(true);
    },
    openEdit(team: TeamListItem) {
      setFormMode("edit");
      setEditingTeam(team);
      setFormOpen(true);
    },
    closeForm,
  };
}

