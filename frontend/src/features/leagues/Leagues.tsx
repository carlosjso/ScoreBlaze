import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { LeagueDetailModal } from "@/features/leagues/components/LeagueDetailModal";
import { LeagueFormModal } from "@/features/leagues/components/LeagueFormModal";
import { LeaguesTable } from "@/features/leagues/components/LeaguesTable";
import { LeaguesToolbar } from "@/features/leagues/components/LeaguesToolbar";
import { useLeaguesData } from "@/features/leagues/hooks/useLeaguesData";
import { useLeaguesModals } from "@/features/leagues/hooks/useLeaguesModals";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { useLeaguesTableData } from "@/features/leagues/hooks/useLeaguesTableData";
import type { SortDir, SortKey } from "@/features/leagues/Leagues.types";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";

export default function Leagues() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const { leagues: catalogLeagues, loading: catalogLoading, error: catalogError } = useLeaguesData();
  const { leagues, loading: tableLoading, error: tableError, page, totalPages } = useLeaguesTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
  });
  const teamsCatalogQuery = useQuery({
    queryKey: teamsQueryKeys.catalog(),
    queryFn: ({ signal }) => teamsService.getCatalog(signal),
  });
  const modals = useLeaguesModals();
  const {
    submitting,
    deletingLeagueId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveLeague,
    deleteLeague,
  } = useLeaguesMutations();

  useEffect(() => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [currentPage, page]);

  const loading = tableLoading || catalogLoading;
  const teamNameById = useMemo(
    () => new Map((teamsCatalogQuery.data ?? []).map((team) => [team.id, team.name])),
    [teamsCatalogQuery.data],
  );
  const leagueById = useMemo(() => new Map(catalogLeagues.map((league) => [league.id, league])), [catalogLeagues]);
  const tableLeagues = useMemo(
    () =>
      leagues.map((league) => {
        const catalogLeague = leagueById.get(league.id);

        if (!catalogLeague || league.logoBase64) {
          return league;
        }

        return {
          ...league,
          logoBase64: catalogLeague.logoBase64,
        };
      }),
    [leagueById, leagues],
  );

  const totalLeagues = catalogLeagues.length;
  const activeLeagues = catalogLeagues.filter((league) => league.status === "En curso").length;
  const pendingLeagues = catalogLeagues.filter((league) => league.status === "Sin empezar").length;
  const finishedLeagues = catalogLeagues.filter((league) => league.status === "Finalizada").length;
  const hasActiveFilters = Boolean(search.trim());

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

  const handleSubmit = async (values: Parameters<typeof saveLeague>[0]["values"]) => {
    await saveLeague({
      mode: modals.formMode,
      leagueId: modals.editingLeague?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deleteLeague) return;

    try {
      await deleteLeague(modals.deleteLeague.id);
      modals.clearDeleteRequest();
    } catch {
      return;
    }
  };

  const editingLeague = modals.editingLeague ? leagueById.get(modals.editingLeague.id) ?? null : null;
  const panelError = mutationErrorMessage ?? tableError ?? catalogError;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Ligas" subtitle="Gestiona ligas, categoria, fechas y equipos participantes." />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Ligas</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalLeagues}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">En curso</p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{activeLeagues}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Sin empezar</p>
            <p className="mt-1 text-2xl font-bold text-amber-600">{pendingLeagues}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Finalizadas</p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{finishedLeagues}</p>
          </div>
        </div>

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {teamsCatalogQuery.error instanceof Error ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No pudimos cargar el catalogo de equipos para completar las etiquetas de esta vista.
            </div>
          ) : null}

          <LeaguesToolbar
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setCurrentPage(1);
            }}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <LeaguesTable
              leagues={tableLeagues}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              currentPage={page}
              totalPages={totalPages}
              pageSize={DEFAULT_TABLE_PAGE_SIZE}
              hasActiveFilters={hasActiveFilters}
              deletingLeagueId={deletingLeagueId}
              onToggleSort={toggleSort}
              onPageChange={setCurrentPage}
              onClearFilters={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              onOpen={(league) => navigate(`/leagues/${league.id}`)}
              onView={modals.openDetail}
              onEdit={(league) => {
                clearMutationError();
                const nextLeague = leagueById.get(league.id);
                if (!nextLeague) {
                  return;
                }

                modals.openEdit(nextLeague);
              }}
              onManage={(league) => navigate(`/leagues/${league.id}/teams`)}
              onDelete={(league) => {
                clearMutationError();
                modals.requestDelete(league);
              }}
            />
          </div>
        </Panel>
      </div>

      <LeagueFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialLeague={editingLeague}
        teams={teamsCatalogQuery.data ?? []}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <LeagueDetailModal
        league={modals.detailLeague}
        isOpen={modals.detailLeague !== null}
        teamNameById={teamNameById}
        onClose={modals.closeDetail}
      />

      <ConfirmModal
        isOpen={modals.deleteLeague !== null}
        title="Eliminar liga"
        message={
          modals.deleteLeague
            ? `Seguro que deseas eliminar la liga ${modals.deleteLeague.name}. Esta accion no se puede deshacer.`
            : "Seguro que deseas eliminar esta liga. Esta accion no se puede deshacer."
        }
        loading={deletingLeagueId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
