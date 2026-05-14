import { useState } from "react";

import type { LeagueFormMode, LeagueListItem } from "@/features/leagues/Leagues.types";

export function useLeaguesModals() {
  const [detailLeague, setDetailLeague] = useState<LeagueListItem | null>(null);
  const [deleteLeague, setDeleteLeague] = useState<LeagueListItem | null>(null);
  const [editingLeague, setEditingLeague] = useState<LeagueListItem | null>(null);
  const [formMode, setFormMode] = useState<LeagueFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingLeague(null);
  };

  return {
    detailLeague,
    deleteLeague,
    editingLeague,
    formMode,
    formOpen,
    openDetail: setDetailLeague,
    closeDetail: () => setDetailLeague(null),
    requestDelete: setDeleteLeague,
    clearDeleteRequest: () => setDeleteLeague(null),
    openCreate() {
      setFormMode("create");
      setEditingLeague(null);
      setFormOpen(true);
    },
    openEdit(league: LeagueListItem) {
      setFormMode("edit");
      setEditingLeague(league);
      setFormOpen(true);
    },
    closeForm,
  };
}
