import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LeagueDetailModal } from "@/features/leagues/components/LeagueDetailModal";
import { LeagueFormModal } from "@/features/leagues/components/LeagueFormModal";
import { LeaguesTable } from "@/features/leagues/components/LeaguesTable";
import { LeaguesToolbar } from "@/features/leagues/components/LeaguesToolbar";
import { useLeaguesData } from "@/features/leagues/hooks/useLeaguesData";
import { useLeaguesModals } from "@/features/leagues/hooks/useLeaguesModals";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { useLeaguesTableData } from "@/features/leagues/hooks/useLeaguesTableData";
import type { CompetitionType, SortDir, SortKey } from "@/features/leagues/Leagues.types";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { truncateText } from "@/shared/utils/truncateText";

export default function Leagues() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const competitionTypeFromUrl: CompetitionType = searchParams.get("type") === "ELIMINATION" ? "ELIMINATION" : "LEAGUE";
  const [competitionTypeFilter, setCompetitionTypeFilter] = useState<CompetitionType>(competitionTypeFromUrl);

  const { leagues: catalogLeagues, loading: catalogLoading, error: catalogError } = useLeaguesData(competitionTypeFilter);
  const { leagues, loading: tableLoading, error: tableError, page, totalPages } = useLeaguesTableData({
    page: currentPage,
    search,
    sortKey,
    sortDir,
    competitionType: competitionTypeFilter,
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

  useEffect(() => {
    if (competitionTypeFilter !== competitionTypeFromUrl) {
      setCompetitionTypeFilter(competitionTypeFromUrl);
      setCurrentPage(1);
    }
  }, [competitionTypeFilter, competitionTypeFromUrl]);

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
  const isEliminationView = competitionTypeFilter === "ELIMINATION";
  const entitySingular = isEliminationView ? "eliminatoria" : "liga";
  const summaryLabel = isEliminationView ? "Eliminatorias" : "Fase regular";

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

  const handleCompetitionTypeChange = (nextCompetitionType: CompetitionType) => {
    if (nextCompetitionType === competitionTypeFilter) {
      return;
    }

    setCompetitionTypeFilter(nextCompetitionType);
    setCurrentPage(1);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("type", nextCompetitionType);
    setSearchParams(nextParams, { replace: true });
  };

  const openCreate = () => {
    clearMutationError();
    modals.openCreate();
  };

  const handleSubmit = async (values: Parameters<typeof saveLeague>[0]["values"]) => {
    const savedLeague = await saveLeague({
      mode: modals.formMode,
      leagueId: modals.editingLeague?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
    return savedLeague;
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
  const deleteLeagueLabel = modals.deleteLeague ? truncateText(modals.deleteLeague.name, 56) : null;
  const formCompetitionType = editingLeague?.competitionType ?? competitionTypeFilter;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Competencias"
          subtitle="Gestiona fase regular y eliminatorias dentro de un solo apartado."
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{summaryLabel}</p>
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
            competitionType={competitionTypeFilter}
            onCompetitionTypeChange={handleCompetitionTypeChange}
            onCreate={openCreate}
            createLabel={isEliminationView ? "Crear eliminatoria" : "Crear liga"}
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
              mode={isEliminationView ? "elimination" : "league"}
            />
          </div>
        </Panel>
      </div>

      <LeagueFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        competitionType={formCompetitionType}
        initialLeague={editingLeague}
        teams={teamsCatalogQuery.data ?? []}
        loading={submitting}
        apiError={mutationError}
        advancedSettingsHref={editingLeague ? `/leagues/${editingLeague.id}/final-phase/settings` : undefined}
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
        title={`Eliminar ${entitySingular}`}
        message={
          modals.deleteLeague
            ? `Seguro que deseas eliminar la ${entitySingular} ${deleteLeagueLabel ?? "seleccionada"}. Esta accion no se puede deshacer.`
            : `Seguro que deseas eliminar esta ${entitySingular}. Esta accion no se puede deshacer.`
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
