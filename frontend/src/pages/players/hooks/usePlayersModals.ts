import { useState } from "react";

import type { PlayerFormMode, PlayerListItem } from "@/pages/players/Players.types";

export function usePlayersModals() {
  const [detailPlayer, setDetailPlayer] = useState<PlayerListItem | null>(null);
  const [deletePlayer, setDeletePlayer] = useState<PlayerListItem | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerListItem | null>(null);
  const [formMode, setFormMode] = useState<PlayerFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingPlayer(null);
  };

  return {
    detailPlayer,
    deletePlayer,
    editingPlayer,
    formMode,
    formOpen,
    openDetail: setDetailPlayer,
    closeDetail: () => setDetailPlayer(null),
    requestDelete: setDeletePlayer,
    clearDeleteRequest: () => setDeletePlayer(null),
    openCreate() {
      setFormMode("create");
      setEditingPlayer(null);
      setFormOpen(true);
    },
    openEdit(player: PlayerListItem) {
      setFormMode("edit");
      setEditingPlayer(player);
      setFormOpen(true);
    },
    closeForm,
  };
}
