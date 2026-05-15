import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PlayerDetailModal } from "@/features/players/components/PlayerDetailModal";
import { PlayerFormModal } from "@/features/players/components/PlayerFormModal";
import { PlayersTable } from "@/features/players/components/PlayersTable";
import { PlayersToolbar } from "@/features/players/components/PlayersToolbar";
import { usePlayersModals } from "@/features/players/hooks/usePlayersModals";
import { usePlayersMutations } from "@/features/players/hooks/usePlayersMutations";
import { usePlayersTableData } from "@/features/players/hooks/usePlayersTableData";
import type { SortDir, SortKey } from "@/features/players/Players.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export default function Players() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const { players, loading, error, page, totalPages } = usePlayersTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
  });
  const modals = usePlayersModals();
  const {
    submitting,
    deletingPlayerId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    savePlayer,
    deletePlayer,
  } = usePlayersMutations();

  const hasActiveFilters = Boolean(search.trim());

  useEffect(() => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage, page]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      setCurrentPage(1);
      return;
    }

    setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setCurrentPage(1);
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

  const panelError = mutationErrorMessage ?? error;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Jugadores" subtitle="Gestiona jugadores y consulta a qué equipos pertenecen." />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <PlayersToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <PlayersTable
              players={players}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={page}
              totalPages={totalPages}
              pageSize={DEFAULT_TABLE_PAGE_SIZE}
              hasActiveFilters={hasActiveFilters}
              deletingPlayerId={deletingPlayerId}
              onToggleSort={toggleSort}
              onPageChange={setCurrentPage}
              onClearFilters={resetFilters}
              onView={modals.openDetail}
              onEdit={(player) => {
                clearMutationError();
                modals.openEdit(player);
              }}
              onManage={(player) => navigate(`/players/${player.id}/teams`)}
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

