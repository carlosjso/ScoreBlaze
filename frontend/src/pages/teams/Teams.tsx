import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { TeamDetailModal } from "@/pages/teams/components/TeamDetailModal";
import { TeamFormModal } from "@/pages/teams/components/TeamFormModal";
import { TeamsTable } from "@/pages/teams/components/TeamsTable";
import { TeamsToolbar } from "@/pages/teams/components/TeamsToolbar";
import { useTeamsData } from "@/pages/teams/hooks/useTeamsData";
import { useTeamsModals } from "@/pages/teams/hooks/useTeamsModals";
import { useTeamsMutations } from "@/pages/teams/hooks/useTeamsMutations";
import type { SortDir, SortKey } from "@/pages/teams/Teams.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";

export default function Teams() {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const { teams, players, loading, error } = useTeamsData();
  const modals = useTeamsModals();
  const {
    submitting,
    deletingTeamId,
    mutationError,
    clearMutationError,
    saveTeam,
    deleteTeam,
  } = useTeamsMutations();

  const orderedTeams = useMemo(() => {
    const sortedTeams = [...teams].sort((left, right) => {
      if (sortKey === "id") return left.id - right.id;
      if (sortKey === "players") return left.playerCount - right.playerCount;
      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });

    return sortDir === "asc" ? sortedTeams : sortedTeams.reverse();
  }, [sortDir, sortKey, teams]);

  const totalPages = Math.max(1, Math.ceil(orderedTeams.length / pageSize));
  const paginatedTeams = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return orderedTeams.slice(start, start + pageSize);
  }, [currentPage, orderedTeams, pageSize]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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

  const handleSubmit = async (values: Parameters<typeof saveTeam>[0]["values"]) => {
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

  const panelError = mutationError ?? error;

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1120px]">
        <div className="mb-5">
          <p className="m-0 text-[12px] font-medium text-slate-500">Listado de equipos</p>
          <h1 className="mt-2 text-[34px] font-semibold tracking-tight text-slate-900 sm:text-[40px]">Equipos</h1>
        </div>

        {panelError ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {panelError}
          </div>
        ) : null}

        <TeamsToolbar
          sortKey={sortKey}
          sortDir={sortDir}
          onSortKeyChange={(value) => {
            setSortKey(value);
            setSortDir("asc");
            setCurrentPage(1);
          }}
          onToggleSortDir={() => {
            setSortDir((currentDir) => (currentDir === "asc" ? "desc" : "asc"));
            setCurrentPage(1);
          }}
          onCreate={openCreate}
        />

        <section className="rounded-[28px] border border-slate-400 bg-[#f4f1eb] p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] sm:p-4">
          <div className="rounded-[24px] border border-slate-300 bg-[#fbfbfa] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] sm:p-4">
            <TeamsTable
              teams={paginatedTeams}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              deletingTeamId={deletingTeamId}
              onToggleSort={toggleSort}
              onPageChange={(page) => setCurrentPage(Math.max(1, Math.min(page, totalPages)))}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setCurrentPage(1);
              }}
              onView={modals.openDetail}
              onEdit={(team) => {
                clearMutationError();
                modals.openEdit(team);
              }}
              onManage={(team) => navigate(`/team-players?team=${team.id}`)}
              onDelete={(team) => {
                clearMutationError();
                modals.requestDelete(team);
              }}
            />
          </div>
        </section>
      </div>

      <TeamFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialTeam={modals.editingTeam}
        players={players}
        defaultPlayerIds={modals.defaultPlayerIds}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <TeamDetailModal team={modals.detailTeam} isOpen={modals.detailTeam !== null} onClose={modals.closeDetail} />

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
