import { useState } from "react";

import type { PlayerFormMode, PlayerListItem } from "@/pages/players/Players.types";

export function usePlayersModals() {
  const [detailPlayer, setDetailPlayer] = useState<PlayerListItem | null>(null);
  const [deletePlayer, setDeletePlayer] = useState<PlayerListItem | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<PlayerListItem | null>(null);
  const [defaultTeamIds, setDefaultTeamIds] = useState<number[]>([]);
  const [formMode, setFormMode] = useState<PlayerFormMode>("create");
  const [formOpen, setFormOpen] = useState(false);

  const closeForm = () => {
    setFormOpen(false);
    setEditingPlayer(null);
    setDefaultTeamIds([]);
  };

  return {
    detailPlayer,
    deletePlayer,
    editingPlayer,
    defaultTeamIds,
    formMode,
    formOpen,
    openDetail: setDetailPlayer,
    closeDetail: () => setDetailPlayer(null),
    requestDelete: setDeletePlayer,
    clearDeleteRequest: () => setDeletePlayer(null),
    openCreate(teamIds: number[] = []) {
      setFormMode("create");
      setEditingPlayer(null);
      setDefaultTeamIds(teamIds);
      setFormOpen(true);
    },
    openEdit(player: PlayerListItem) {
      setFormMode("edit");
      setEditingPlayer(player);
      setDefaultTeamIds(player.teamIds);
      setFormOpen(true);
    },
    closeForm,
  };
}
