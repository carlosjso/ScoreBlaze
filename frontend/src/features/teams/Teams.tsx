import { useTeamHistoricalStats } from "@/features/teams/hooks/useTeamHistoricalStats";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { TeamDetailModal } from "@/features/teams/components/TeamDetailModal";
import { TeamFormModal } from "@/features/teams/components/TeamFormModal";
import { TeamsTable } from "@/features/teams/components/TeamsTable";
import { useTeamsTableData } from "@/features/teams/hooks/useTeamsTableData";
import { TeamsToolbar } from "@/features/teams/components/TeamsToolbar";
import { useTeamsModals } from "@/features/teams/hooks/useTeamsModals";
import { useTeamsMutations } from "@/features/teams/hooks/useTeamsMutations";
import type { SortDir, SortKey } from "@/features/teams/Teams.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export default function Teams() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { teams, loading, error, page, totalPages } = useTeamsTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
  });
  const modals = useTeamsModals();
  const detailTeamStatsQuery = useTeamHistoricalStats(modals.detailTeam?.id ?? null);
  const {
    submitting,
    deletingTeamId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveTeam,
    deleteTeam,
  } = useTeamsMutations();

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

  const openCreate = () => {
    clearMutationError();
    modals.openCreate();
  };

  const handleSubmit = async (
    values: Parameters<typeof saveTeam>[0]["values"],
  ) => {
    await saveTeam({
      mode: modals.formMode,
      teamId: modals.editingTeam?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deleteTeam) return;

    try {
      await deleteTeam(modals.deleteTeam.id);
      modals.clearDeleteRequest();
    } catch {
      return;
    }
  };

  const panelError = mutationErrorMessage ?? error;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Equipos"
          subtitle="Gestiona equipos y revisa rapidamente su plantilla asignada."
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <TeamsToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <TeamsTable
              teams={teams}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={page}
              totalPages={totalPages}
              pageSize={DEFAULT_TABLE_PAGE_SIZE}
              deletingTeamId={deletingTeamId}
              onToggleSort={toggleSort}
              onPageChange={setCurrentPage}
              onView={modals.openDetail}
              onEdit={(team) => {
                clearMutationError();
                modals.openEdit(team);
              }}
              onManage={(team) => navigate(`/teams/${team.id}/roster`)}
              onDelete={(team) => {
                clearMutationError();
                modals.requestDelete(team);
              }}
            />
          </div>
        </Panel>
      </div>

      <TeamFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialTeam={modals.editingTeam}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <TeamDetailModal
        team={modals.detailTeam}
        isOpen={modals.detailTeam !== null}
        onClose={modals.closeDetail}
        stats={detailTeamStatsQuery.data ?? null}
        statsLoading={detailTeamStatsQuery.isPending}
        statsError={detailTeamStatsQuery.error instanceof Error ? detailTeamStatsQuery.error.message : null}
      />

      <ConfirmModal
        isOpen={modals.deleteTeam !== null}
        title="Eliminar equipo"
        message={
          modals.deleteTeam
            ? `Seguro que deseas eliminar ${modals.deleteTeam.name}. Esta accion no se puede deshacer.`
            : "Esta accion no se puede deshacer."
        }
        loading={deletingTeamId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}

