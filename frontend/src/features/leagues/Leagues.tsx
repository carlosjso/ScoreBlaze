import { ArrowDown, ArrowUp, ListOrdered, Shuffle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";

import { LeagueDetailModal } from "@/features/leagues/components/LeagueDetailModal";
import { LeagueFormModal } from "@/features/leagues/components/LeagueFormModal";
import { leagueMatchesService, type LeagueMatchesSnapshot } from "@/features/leagues/LeagueMatches.service";
import { leaguesService } from "@/features/leagues/Leagues.service";
import { LeaguesTable } from "@/features/leagues/components/LeaguesTable";
import { LeaguesToolbar } from "@/features/leagues/components/LeaguesToolbar";
import { useLeaguesData } from "@/features/leagues/hooks/useLeaguesData";
import { useLeaguesModals } from "@/features/leagues/hooks/useLeaguesModals";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { useLeaguesTableData } from "@/features/leagues/hooks/useLeaguesTableData";
import { summarizeGroupSchedule, summarizeLeagueSchedule } from "@/features/leagues/leagueScheduleCoverage";
import type { CompetitionType, LeagueFormSubmitOptions, LeagueFormValues, SortDir, SortKey } from "@/features/leagues/Leagues.types";
import { buildQuickMatchesView } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { Button, Modal, PageHeader, Panel } from "@/shared/components/ui";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/constants/pagination";
import { cn } from "@/shared/utils/cn";
import { truncateText } from "@/shared/utils/truncateText";

type BracketSeedMode = "STANDINGS" | "RANDOM" | "MANUAL";

type PendingStructureChange = {
  snapshot: LeagueMatchesSnapshot;
  values: LeagueFormValues;
};

type PendingFinish = {
  values: LeagueFormValues;
  options?: LeagueFormSubmitOptions;
  missingMatches: number;
  unfinishedMatches: number;
  duplicateMatches: number;
  unfinishedFinalMatches: number;
  finalPhaseIncomplete: boolean;
};

export default function Leagues() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingStructureChange, setPendingStructureChange] = useState<PendingStructureChange | null>(null);
  const [pendingBracketSeedMode, setPendingBracketSeedMode] = useState<BracketSeedMode>("STANDINGS");
  const [pendingManualTeamIds, setPendingManualTeamIds] = useState<number[]>([]);
  const [workflowError, setWorkflowError] = useState<unknown>(null);
  const [pendingFinish, setPendingFinish] = useState<PendingFinish | null>(null);
  const requestedCompetitionType = searchParams.get("type");
  const competitionTypeFromUrl: CompetitionType | undefined = requestedCompetitionType === "LEAGUE" || requestedCompetitionType === "ELIMINATION" || requestedCompetitionType === "GROUPS"
    ? requestedCompetitionType
    : undefined;
  const [competitionTypeFilter, setCompetitionTypeFilter] = useState<CompetitionType | undefined>(competitionTypeFromUrl);

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
    convertingLeague,
    convertLeagueToElimination,
    deleteLeague,
  } = useLeaguesMutations();

  const clearAllErrors = () => {
    setWorkflowError(null);
    clearMutationError();
  };

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
  const isGroupsView = competitionTypeFilter === "GROUPS";
  const isAllCompetitionsView = competitionTypeFilter === undefined;
  const entitySingular = isAllCompetitionsView ? "competencia" : isEliminationView ? "eliminatoria" : isGroupsView ? "torneo por grupos" : "liga";
  const summaryLabel = isAllCompetitionsView ? "Todas las competencias" : isEliminationView ? "Eliminatorias" : isGroupsView ? "Fase de grupos" : "Fase regular";

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

  const handleCompetitionTypeChange = (nextCompetitionType?: CompetitionType) => {
    if (nextCompetitionType === competitionTypeFilter) {
      return;
    }

    setCompetitionTypeFilter(nextCompetitionType);
    setCurrentPage(1);

    const nextParams = new URLSearchParams(searchParams);
    if (nextCompetitionType) {
      nextParams.set("type", nextCompetitionType);
    } else {
      nextParams.delete("type");
    }
    setSearchParams(nextParams, { replace: true });
  };

  const openCreate = () => {
    clearAllErrors();
    setPendingStructureChange(null);
    modals.openCreate();
  };

  const syncCompetitionFilter = (nextCompetitionType: CompetitionType) => {
    if (competitionTypeFilter === undefined) {
      return;
    }

    if (nextCompetitionType === competitionTypeFilter) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("type", nextCompetitionType);
    setCompetitionTypeFilter(nextCompetitionType);
    setCurrentPage(1);
    setSearchParams(nextParams, { replace: true });
  };

  const persistLeague = async (values: LeagueFormValues, options?: LeagueFormSubmitOptions) => {
    return saveLeague({
      mode: modals.formMode,
      leagueId: modals.editingLeague?.id,
      values,
      options,
    });
  };

  const handleSubmit = async (values: LeagueFormValues, options?: LeagueFormSubmitOptions) => {
    clearAllErrors();

    const isCreatingLeague = modals.formMode === "create";
    const editingLeagueId = modals.editingLeague?.id;
    const isEditingLeague = modals.formMode === "edit" && Number.isInteger(editingLeagueId) && editingLeagueId !== undefined;
    const isConvertingToElimination = modals.editingLeague?.competitionType !== "ELIMINATION" && values.competitionType === "ELIMINATION";

    const isFinishingLeague = (modals.editingLeague?.competitionType === "LEAGUE" || modals.editingLeague?.competitionType === "ELIMINATION" || modals.editingLeague?.competitionType === "GROUPS")
      && modals.editingLeague.status !== "Finalizada"
      && values.status === "Finalizada"
      && !options?.confirmIncompleteFinish;
    if (isEditingLeague && isFinishingLeague && editingLeagueId) {
      try {
        const snapshot = await leagueMatchesService.getSnapshot(editingLeagueId);
        const viewMatches = buildQuickMatchesView(snapshot.matches, snapshot.teams);
        const audit = modals.editingLeague?.competitionType === "LEAGUE"
          ? { ...summarizeLeagueSchedule(
              values.teamIds,
              values.regularSeasonFormat,
              viewMatches,
            ), duplicateMatches: 0 }
          : modals.editingLeague?.competitionType === "GROUPS"
            ? summarizeGroupSchedule(values.groupStageConfig, values.regularSeasonFormat, viewMatches)
            : { missingMatches: 0, unfinishedMatches: 0, duplicateMatches: 0 };
        const unfinishedFinalMatches = snapshot.matches.filter((match) => match.competition_stage === "FINAL_PHASE" && match.status !== "finished").length;
        const finalPhaseIncomplete = (values.finalPhaseEnabled || modals.editingLeague?.competitionType === "ELIMINATION") && !modals.editingLeague?.bracketCompleted;
        if (audit.missingMatches > 0 || audit.unfinishedMatches > 0 || audit.duplicateMatches > 0 || finalPhaseIncomplete) {
          setPendingFinish({ values, options, ...audit, unfinishedFinalMatches, finalPhaseIncomplete });
          return;
        }
      } catch (error) {
        setWorkflowError(error);
        return;
      }
    }

    if (isEditingLeague && isConvertingToElimination && editingLeagueId) {
      try {
        const snapshot = await leagueMatchesService.getSnapshot(editingLeagueId);

        if (snapshot.matches.length > 0) {
          setPendingBracketSeedMode(snapshot.matches.some((match) => match.status === "finished") ? "STANDINGS" : "RANDOM");
          setPendingManualTeamIds(Array.from(new Set(values.teamIds)));
          setPendingStructureChange({
            snapshot,
            values,
          });
          return;
        }
      } catch (error) {
        setWorkflowError(error);
        return;
      }
    }

    try {
      const savedLeague = await persistLeague(values, options);
      clearAllErrors();
      modals.closeForm();
      if (savedLeague?.competitionType) {
        syncCompetitionFilter(savedLeague.competitionType);
      }
      if (isCreatingLeague && savedLeague?.id) {
        navigate(
          savedLeague.competitionType === "GROUPS"
            ? `/leagues/${savedLeague.id}/teams/manage`
            : `/leagues/${savedLeague.id}/final-phase/settings`,
        );
      }
      return savedLeague;
    } catch (error) {
      setWorkflowError(error);
      return;
    }
  };

  const handleConfirmStructureChange = async () => {
    if (!pendingStructureChange) {
      return;
    }

    clearAllErrors();

    try {
      const { snapshot, values } = pendingStructureChange;
      const selectedTeamIds = Array.from(new Set(values.teamIds));
      let orderedTeamIds = [...selectedTeamIds];
      if (pendingBracketSeedMode === "MANUAL") {
        const selectedSet = new Set(selectedTeamIds);
        const manuallyOrdered = pendingManualTeamIds.filter((teamId) => selectedSet.has(teamId));
        const manuallyOrderedSet = new Set(manuallyOrdered);
        orderedTeamIds = [...manuallyOrdered, ...selectedTeamIds.filter((teamId) => !manuallyOrderedSet.has(teamId))];
      } else if (pendingBracketSeedMode === "STANDINGS") {
        const standings = (await leaguesService.getLeagueStats(snapshot.league.id)).standings;
        const selectedSet = new Set(selectedTeamIds);
        const rankedTeamIds = standings.map((row) => row.teamId).filter((teamId) => selectedSet.has(teamId));
        const rankedSet = new Set(rankedTeamIds);
        const remainingTeamIds = selectedTeamIds
          .filter((teamId) => !rankedSet.has(teamId))
          .sort((left, right) => (teamNameById.get(left) ?? "").localeCompare(teamNameById.get(right) ?? "", "es") || left - right);
        orderedTeamIds = [...rankedTeamIds, ...remainingTeamIds];
      } else {
        for (let index = orderedTeamIds.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [orderedTeamIds[index], orderedTeamIds[swapIndex]] = [orderedTeamIds[swapIndex], orderedTeamIds[index]];
        }
      }

      const savedLeague = await convertLeagueToElimination({
        leagueId: snapshot.league.id,
        values,
        orderedTeamIds,
        expectedMatchIds: snapshot.matches.map((match) => match.id),
        seedMode: pendingBracketSeedMode,
      });

      setPendingStructureChange(null);
      clearAllErrors();
      modals.closeForm();
      if (savedLeague.competitionType) {
        syncCompetitionFilter(savedLeague.competitionType);
      }
    } catch (error) {
      setWorkflowError(error);
    }
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

  const editingLeague = modals.editingLeague;
  const workflowErrorMessage = workflowError instanceof Error ? workflowError.message : null;
  const panelError = workflowErrorMessage ?? mutationErrorMessage ?? tableError ?? catalogError;
  const deleteLeagueLabel = modals.deleteLeague ? truncateText(modals.deleteLeague.name, 56) : null;
  const formCompetitionType = editingLeague?.competitionType ?? competitionTypeFilter ?? "LEAGUE";
  const formLoading = submitting || convertingLeague;
  const formApiError = workflowError ?? mutationError;
  const pendingMatchesCount = pendingStructureChange?.snapshot.matches.length ?? 0;
  const pendingHasFinishedMatches = pendingStructureChange?.snapshot.matches.some((match) => match.status === "finished") ?? false;
  const pendingQualifiedTeamCount = pendingManualTeamIds.length;
  const pendingManualQualifierIds = pendingManualTeamIds.slice(0, pendingQualifiedTeamCount);
  const pendingManualAvailableIds = pendingManualTeamIds.slice(pendingQualifiedTeamCount);

  const movePendingManualTeam = (teamId: number, direction: -1 | 1) => {
    setPendingManualTeamIds((current) => {
      const index = current.indexOf(teamId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= pendingQualifiedTeamCount) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const promotePendingManualTeam = (teamId: number) => {
    setPendingManualTeamIds((current) => {
      const index = current.indexOf(teamId);
      if (index < pendingQualifiedTeamCount || index < 0 || pendingQualifiedTeamCount < 1) return current;
      const next = [...current];
      const [promotedTeamId] = next.splice(index, 1);
      next.splice(Math.min(pendingQualifiedTeamCount - 1, next.length), 0, promotedTeamId);
      return next;
    });
  };

  const removePendingManualQualifier = (teamId: number) => {
    setPendingManualTeamIds((current) => {
      const index = current.indexOf(teamId);
      if (index < 0 || index >= pendingQualifiedTeamCount || current.length <= pendingQualifiedTeamCount) return current;
      const next = [...current];
      const [removedTeamId] = next.splice(index, 1);
      next.splice(Math.min(pendingQualifiedTeamCount, next.length), 0, removedTeamId);
      return next;
    });
  };

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
            createLabel="Crear competencia"
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
              onEdit={async (league) => {
                clearAllErrors();
                setPendingStructureChange(null);

                try {
                  // The edit form needs the exact match count to show destructive-change warnings only when relevant.
                  const nextLeague = await leaguesService.getLeague(league.id);
                  modals.openEdit(nextLeague);
                } catch (error) {
                  setWorkflowError(error);
                }
              }}
              onManage={(league) => navigate(`/leagues/${league.id}/teams`)}
              onDelete={(league) => {
                clearAllErrors();
                setPendingStructureChange(null);
                modals.requestDelete(league);
              }}
              mode={isEliminationView ? "elimination" : isGroupsView ? "groups" : "league"}
            />
          </div>
        </Panel>
      </div>

      <LeagueFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        competitionType={formCompetitionType}
        initialLeague={editingLeague}
        loading={formLoading}
        apiError={formApiError}
        onClose={() => {
          clearAllErrors();
          setPendingStructureChange(null);
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <ConfirmModal
        isOpen={pendingFinish !== null}
        title={pendingFinish?.values.competitionType === "ELIMINATION" ? "Finalizar eliminatoria antes de tiempo" : "Finalizar competencia con fases pendientes"}
        message={pendingFinish
          ? pendingFinish.values.competitionType === "ELIMINATION"
            ? `La llave aun no tiene campeon o conserva ${pendingFinish.unfinishedFinalMatches} cruce(s) abierto(s). Puedes finalizarla de todas formas si hubo bajas o un cierre extraordinario, pero sus partidos quedaran bloqueados. ¿Deseas continuar?`
            : pendingFinish.values.competitionType === "GROUPS"
              ? `Faltan ${pendingFinish.missingMatches} cruce(s) de grupos, hay ${pendingFinish.unfinishedMatches} partido(s) sin finalizar y ${pendingFinish.duplicateMatches} excedente(s).${pendingFinish.finalPhaseIncomplete ? ` La fase final aun no concluye y conserva ${pendingFinish.unfinishedFinalMatches} partido(s) abierto(s).` : ""} Puedes finalizar de todas formas, pero el torneo quedara bloqueado. ¿Deseas continuar?`
            : `Faltan ${pendingFinish.missingMatches} cruce(s) regulares por crear y hay ${pendingFinish.unfinishedMatches} partido(s) regulares sin finalizar.${pendingFinish.finalPhaseIncomplete ? ` La fase final aun no concluye y conserva ${pendingFinish.unfinishedFinalMatches} partido(s) abierto(s).` : ""} Puedes finalizar de todas formas si hubo bajas o un cierre extraordinario. ¿Deseas continuar?`
          : ""}
        confirmText="Finalizar de todas formas"
        confirmVariant="primary"
        loading={submitting}
        onCancel={() => setPendingFinish(null)}
        onConfirm={async () => {
          if (!pendingFinish) return;
          const pending = pendingFinish;
          setPendingFinish(null);
          await handleSubmit(pending.values, { ...pending.options, confirmIncompleteFinish: true });
        }}
      />

      <Modal
        isOpen={pendingStructureChange !== null}
        onClose={() => {
          if (formLoading) {
            return;
          }
          setPendingStructureChange(null);
          clearAllErrors();
        }}
        title="Cambiar a eliminatoria directa"
        maxWidthClassName="max-w-2xl"
      >
        <div className="space-y-4">
          <section className="rounded-[24px] border border-amber-200 bg-[linear-gradient(135deg,#fffbeb_0%,#fff7ed_100%)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Se reiniciara la competencia</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">Se perdera el progreso actual de partidos y cruces</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Al guardar, eliminaremos {pendingMatchesCount} {pendingMatchesCount === 1 ? "partido" : "partidos"} de esta competencia
              para reconstruir la primera ronda con la nueva estructura.
            </p>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Como sembrar la llave</p>
              <h3 className="text-lg font-semibold text-slate-950">Elige como quieres armar los primeros cruces</h3>
              <p className="text-sm text-slate-500">
                La eleccion solo aplica a la nueva primera ronda; despues podras seguir ajustando la competencia desde la vista de llaves.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setPendingBracketSeedMode("STANDINGS")}
                disabled={formLoading}
                className={cn(
                  "rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  pendingBracketSeedMode === "STANDINGS"
                    ? "border-sky-200 bg-sky-50 shadow-[0_12px_24px_rgba(14,165,233,0.12)]"
                    : "border-slate-200 bg-slate-50/80 hover:border-sky-200 hover:bg-sky-50/70",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-950">Por tabla actual</span>
                  <span className="inline-flex rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">
                    {pendingBracketSeedMode === "STANDINGS" ? "Seleccionado" : pendingHasFinishedMatches ? "Recomendado" : "Disponible"}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Usa la clasificacion actual para sembrar la llave y cruzar a los mejores contra los ultimos clasificados.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPendingBracketSeedMode("RANDOM")}
                disabled={formLoading}
                className={cn(
                  "rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  pendingBracketSeedMode === "RANDOM"
                    ? "border-orange-200 bg-orange-50 shadow-[0_12px_24px_rgba(249,115,22,0.12)]"
                    : "border-slate-200 bg-slate-50/80 hover:border-orange-200 hover:bg-orange-50/70",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-950">Aleatoria</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-orange-700">
                    <Shuffle size={11} />
                    Sorteo
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Sortea los cruces desde cero y reparte los byes sin respetar la tabla que llevaba la competencia.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPendingBracketSeedMode("MANUAL")}
                disabled={formLoading}
                className={cn(
                  "rounded-[22px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
                  pendingBracketSeedMode === "MANUAL"
                    ? "border-orange-200 bg-orange-50 shadow-[0_12px_24px_rgba(249,115,22,0.12)]"
                    : "border-slate-200 bg-slate-50/80 hover:border-orange-200 hover:bg-orange-50/70",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-950">Orden manual</span>
                  <ListOrdered size={15} className="text-orange-600" />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-500">Ordena cada sembrado antes de construir los cruces.</p>
              </button>
            </div>

            {pendingBracketSeedMode === "MANUAL" && pendingStructureChange ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)]">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-orange-700">Participantes y orden</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {pendingManualQualifierIds.map((teamId, index) => {
                      const teamName = teamNameById.get(teamId);
                      if (!teamName) return null;
                      return (
                        <div key={teamId} className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50/50 px-3 py-2">
                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-xs font-black text-orange-600">{index + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-700">{teamName}</span>
                          <button type="button" disabled={index === 0} onClick={() => movePendingManualTeam(teamId, -1)} className="rounded-lg p-1 text-slate-400 disabled:opacity-30"><ArrowUp size={14} /></button>
                          <button type="button" disabled={index === pendingQualifiedTeamCount - 1} onClick={() => movePendingManualTeam(teamId, 1)} className="rounded-lg p-1 text-slate-400 disabled:opacity-30"><ArrowDown size={14} /></button>
                          {pendingManualAvailableIds.length > 0 ? (
                            <button type="button" onClick={() => removePendingManualQualifier(teamId)} className="text-[10px] font-bold uppercase text-slate-400 hover:text-red-600">Sacar</button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Fuera del corte</p>
                  <div className="mt-2 space-y-2">
                    {pendingManualAvailableIds.length > 0 ? pendingManualAvailableIds.map((teamId) => (
                      <div key={teamId} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-600">{teamNameById.get(teamId) ?? `Equipo #${teamId}`}</span>
                        <button type="button" onClick={() => promotePendingManualTeam(teamId)} className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase text-sky-700">Clasificar</button>
                      </div>
                    )) : <p className="text-xs text-slate-500">Todos los equipos inscritos participan.</p>}
                  </div>
                </div>
              </div>
            ) : null}

            {!pendingHasFinishedMatches ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                Esta competencia todavia no tiene resultados finalizados. Si eliges sembrar por tabla y todo sigue empatado, el orden se completara con la configuracion disponible.
              </div>
            ) : null}
          </section>

          {workflowErrorMessage ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {workflowErrorMessage}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setPendingStructureChange(null);
                clearAllErrors();
              }}
              disabled={formLoading}
            >
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleConfirmStructureChange} disabled={formLoading}>
              {formLoading
                ? "Rearmando competencia..."
                : pendingBracketSeedMode === "STANDINGS"
                  ? "Guardar y sembrar por tabla"
                  : pendingBracketSeedMode === "MANUAL"
                    ? "Guardar con orden manual"
                    : "Guardar y sortear llave"}
            </Button>
          </div>
        </div>
      </Modal>

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
          clearAllErrors();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
