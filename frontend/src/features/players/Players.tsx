import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PlayerDetailModal } from "@/features/players/components/PlayerDetailModal";
import { PlayerFormModal } from "@/features/players/components/PlayerFormModal";
import { PlayersTable } from "@/features/players/components/PlayersTable";
import { PlayersToolbar } from "@/features/players/components/PlayersToolbar";
import { usePlayersData } from "@/features/players/hooks/usePlayersData";
import { usePlayersModals } from "@/features/players/hooks/usePlayersModals";
import { usePlayersMutations } from "@/features/players/hooks/usePlayersMutations";
import type { SortDir, SortKey, TeamFilterValue } from "@/features/players/Players.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";

export default function Players() {
  const [params] = useSearchParams();
  const queryTeam = Number(params.get("team"));
  const initialTeamFilter =
    Number.isInteger(queryTeam) && queryTeam > 0 ? (String(queryTeam) as `${number}`) : "all";

  const [teamFilter, setTeamFilter] = useState<TeamFilterValue>(initialTeamFilter);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const deferredSearch = useDeferredValue(search);

  const { players, teams, loading, error } = usePlayersData();
  const modals = usePlayersModals();
  const {
    submitting,
    deletingPlayerId,
    mutationError,
    clearMutationError,
    savePlayer,
    deletePlayer,
  } = usePlayersMutations();

  useEffect(() => {
    if (teamFilter === "all" || teamFilter === "none") return;
    const exists = teams.some((team) => String(team.id) === teamFilter);
    if (!exists && teams.length > 0) {
      setTeamFilter("all");
    }
  }, [teamFilter, teams]);

  const selectedTeamId = useMemo(() => {
    if (teamFilter === "all" || teamFilter === "none") return null;
    const parsed = Number(teamFilter);
    return Number.isInteger(parsed) ? parsed : null;
  }, [teamFilter]);

  const filteredPlayers = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    let basePlayers = [...players];

    if (teamFilter === "none") {
      basePlayers = basePlayers.filter((player) => player.teamIds.length === 0);
    } else if (selectedTeamId !== null) {
      basePlayers = basePlayers.filter((player) => player.teamIds.includes(selectedTeamId));
    }

    if (normalizedSearch) {
      basePlayers = basePlayers.filter((player) => {
        return (
          String(player.id).includes(normalizedSearch) ||
          player.name.toLowerCase().includes(normalizedSearch) ||
          player.email.toLowerCase().includes(normalizedSearch) ||
          player.phone.toLowerCase().includes(normalizedSearch) ||
          player.status.toLowerCase().includes(normalizedSearch) ||
          player.teamLabel.toLowerCase().includes(normalizedSearch)
        );
      });
    }

    const sortedPlayers = [...basePlayers].sort((left, right) => {
      if (sortKey === "id") {
        return left.id - right.id;
      }

      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });

    return sortDir === "asc" ? sortedPlayers : sortedPlayers.reverse();
  }, [deferredSearch, players, selectedTeamId, sortDir, sortKey, teamFilter]);

  const hasActiveFilters = Boolean(search.trim()) || teamFilter !== "all";

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }

    setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
  };

  const resetFilters = () => {
    setSearch("");
    setTeamFilter("all");
  };

  const openCreate = () => {
    clearMutationError();
    modals.openCreate();
  };

  const handleSubmit = async (values: Parameters<typeof savePlayer>[0]["values"]) => {
    await savePlayer({
      mode: modals.formMode,
      playerId: modals.editingPlayer?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deletePlayer) return;

    try {
      await deletePlayer(modals.deletePlayer.id);
      modals.clearDeleteRequest();
    } catch {
      return;
    }
  };

  const panelError = mutationError ?? error;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Jugadores" subtitle="Gestiona jugadores y sus relaciones reales con uno o varios equipos." />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <PlayersToolbar
            teams={teams}
            teamFilter={teamFilter}
            search={search}
            onTeamFilterChange={setTeamFilter}
            onSearchChange={setSearch}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <PlayersTable
              players={filteredPlayers}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              hasActiveFilters={hasActiveFilters}
              deletingPlayerId={deletingPlayerId}
              onToggleSort={toggleSort}
              onClearFilters={resetFilters}
              onView={modals.openDetail}
              onEdit={(player) => {
                clearMutationError();
                modals.openEdit(player);
              }}
              onDelete={(player) => {
                clearMutationError();
                modals.requestDelete(player);
              }}
            />
          </div>
        </Panel>
      </div>

      <PlayerFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialPlayer={modals.editingPlayer}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <PlayerDetailModal player={modals.detailPlayer} isOpen={modals.detailPlayer !== null} onClose={modals.closeDetail} />

      <ConfirmModal
        isOpen={modals.deletePlayer !== null}
        title="Eliminar jugador"
        message={
          modals.deletePlayer
            ? `Seguro que quieres eliminar a ${modals.deletePlayer.name}. Esta accion no se puede deshacer.`
            : "Seguro que quieres eliminar este jugador. Esta accion no se puede deshacer."
        }
        loading={deletingPlayerId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

