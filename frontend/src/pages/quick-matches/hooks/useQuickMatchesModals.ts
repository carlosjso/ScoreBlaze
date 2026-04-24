import { useState } from "react";

import type { MatchFormMode, QuickMatchListItem } from "@/pages/quick-matches/QuickMatches.types";

export function useQuickMatchesModals() {
  const [detailMatch, setDetailMatch] = useState<QuickMatchListItem | null>(null);
  const [deleteMatch, setDeleteMatch] = useState<QuickMatchListItem | null>(null);
  const [editingMatch, setEditingMatch] = useState<QuickMatchListItem | null>(null);
  const [formMode, setFormMode] = useState<MatchFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingMatch(null);
  };

  return {
    detailMatch,
    deleteMatch,
    editingMatch,
    formMode,
    formOpen,
    openDetail: setDetailMatch,
    closeDetail: () => setDetailMatch(null),
    requestDelete: setDeleteMatch,
    clearDeleteRequest: () => setDeleteMatch(null),
    openCreate() {
      setFormMode("create");
      setEditingMatch(null);
      setFormOpen(true);
    },
    openEdit(match: QuickMatchListItem) {
      setFormMode("edit");
      setEditingMatch(match);
      setFormOpen(true);
    },
    closeForm,
  };
}
