import { CalendarDays, Shield, UsersRound } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { useLeagueMatchesMutations } from "@/features/leagues/hooks/useLeagueMatchesMutations";
import { QuickMatchDetailModal } from "@/features/quick-matches/components/QuickMatchDetailModal";
import { QuickMatchFormModal } from "@/features/quick-matches/components/QuickMatchFormModal";
import { QuickMatchesTable } from "@/features/quick-matches/components/QuickMatchesTable";
import { QuickMatchesToolbar } from "@/features/quick-matches/components/QuickMatchesToolbar";
import { useQuickMatchesModals } from "@/features/quick-matches/hooks/useQuickMatchesModals";
import type { MatchStatusFilter, SortDir, SortKey } from "@/features/quick-matches/QuickMatches.types";
import { matchStatusSortOrder } from "@/features/quick-matches/QuickMatches.types";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { PageHeader, Panel } from "@/shared/components/ui";

export default function LeagueMatchesPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>("all");
  const sortKey: SortKey = "id";
  const sortDir: SortDir = "asc";
  const deferredSearch = useDeferredValue(search);

  const { league, matches, teams, loading, error } = useLeagueMatchesData(hasValidLeagueId ? selectedLeagueId : null);
  const modals = useQuickMatchesModals();
  const {
    submitting,
    deletingMatchId,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveMatch,
    deleteMatch,
  } = useLeagueMatchesMutations();

  const filteredMatches = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    let baseMatches = [...matches];

    if (statusFilter !== "all") {
      baseMatches = baseMatches.filter((match) => match.status === statusFilter);
    }

    if (normalizedSearch) {
      baseMatches = baseMatches.filter((match) => {
        return (
          String(match.id).includes(normalizedSearch) ||
          match.matchupLabel.toLowerCase().includes(normalizedSearch) ||
          match.dateLabel.toLowerCase().includes(normalizedSearch) ||
          match.timeLabel.toLowerCase().includes(normalizedSearch) ||
          match.scoreLabel.toLowerCase().includes(normalizedSearch) ||
          match.resultLabel.toLowerCase().includes(normalizedSearch) ||
          match.venueLabel.toLowerCase().includes(normalizedSearch) ||
          match.statusLabel.toLowerCase().includes(normalizedSearch)
        );
      });
    }

    const sortedMatches = [...baseMatches].sort((left, right) => {
      if (sortKey === "id") {
        return left.id - right.id;
      }

      if (sortKey === "status") {
        return matchStatusSortOrder[left.status] - matchStatusSortOrder[right.status];
      }

      const leftScheduleKey = `${left.matchDate} ${left.startTime}`;
      const rightScheduleKey = `${right.matchDate} ${right.startTime}`;
      return leftScheduleKey.localeCompare(rightScheduleKey);
    });

    return sortDir === "asc" ? sortedMatches : sortedMatches.reverse();
  }, [deferredSearch, matches, sortDir, sortKey, statusFilter]);

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";
  const panelError = mutationErrorMessage ?? error;

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  const openCreate = () => {
    if (!league) {
      return;
    }

    clearMutationError();
    modals.openCreate();
  };

  const handleSubmit = async (values: Parameters<typeof saveMatch>[0]["values"]) => {
    if (!league) {
      return;
    }

    await saveMatch({
      mode: modals.formMode,
      matchId: modals.editingMatch?.id,
      leagueId: league.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!league || !modals.deleteMatch) {
      return;
    }

    try {
      await deleteMatch(league.id, modals.deleteMatch.id);
      modals.clearDeleteRequest();
    } catch {
      return;
    }
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Partidos de liga"
          subtitle="Programa y administra partidos usando solo los equipos asignados a esta liga."
          actions={<LeagueSectionNav leagueId={league?.id} active="matches" />}
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {!loading && !hasValidLeagueId ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="El enlace de esta liga es invalido o ya no esta disponible."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {!loading && hasValidLeagueId && !league ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="No encontramos la liga que intentaste abrir."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {league ? (
            <>
              <section className="mb-4 rounded-[28px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Liga activa</p>
                    <h2 className="mt-2 text-[30px] leading-none text-slate-950 sm:text-[34px]">{league.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">
                      Aqui solo puedes enfrentar equipos que ya forman parte de esta liga y conservar todo el historial dentro del torneo.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <UsersRound size={14} />
                      {teams.length} {teams.length === 1 ? "equipo" : "equipos"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <CalendarDays size={14} />
                      {matches.length} {matches.length === 1 ? "partido" : "partidos"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <Shield size={14} />
                      {league.category}
                    </span>
                    <StatusBadge status={league.status} />
                  </div>
                </div>
              </section>

              {!panelError && teams.length < 2 ? (
                <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Necesitas al menos 2 equipos dentro de la liga para programar partidos.
                </div>
              ) : null}

              <QuickMatchesToolbar
                search={search}
                statusFilter={statusFilter}
                disabled={loading || teams.length < 2}
                searchPlaceholder="Buscar por equipo, estatus o fecha"
                createButtonLabel="Crear partido de liga"
                onSearchChange={setSearch}
                onStatusFilterChange={setStatusFilter}
                onCreate={openCreate}
              />

              <div className="mt-4">
                <QuickMatchesTable
                  matches={filteredMatches}
                  loading={loading}
                  statusFilter={statusFilter}
                  hasActiveFilters={hasActiveFilters}
                  deletingMatchId={deletingMatchId}
                  loadingLabel="Cargando partidos de la liga..."
                  emptyStateTitle="No hay partidos registrados en esta liga"
                  emptyStateDescription="Programa el primer partido de esta liga usando solo sus equipos asignados."
                  emptyStateActionLabel="Crear partido de liga"
                  buildStatsPath={(match) => `/leagues/${league.id}/matches/${match.id}/stats`}
                  onEmptyAction={openCreate}
                  onClearFilters={resetFilters}
                  onView={modals.openDetail}
                  onEdit={(match) => {
                    clearMutationError();
                    modals.openEdit(match);
                  }}
                  onDelete={(match) => {
                    clearMutationError();
                    modals.requestDelete(match);
                  }}
                />
              </div>
            </>
          ) : null}
        </Panel>
      </div>

      <QuickMatchFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialMatch={modals.editingMatch}
        teams={teams}
        title={modals.formMode === "create" ? "Crear partido de liga" : "Editar partido de liga"}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <QuickMatchDetailModal
        match={modals.detailMatch}
        isOpen={modals.detailMatch !== null}
        title="Detalle de partido de liga"
        onClose={modals.closeDetail}
      />

      <ConfirmModal
        isOpen={modals.deleteMatch !== null}
        title="Eliminar partido de liga"
        message={
          modals.deleteMatch
            ? `Seguro que deseas eliminar ${modals.deleteMatch.matchupLabel} de ${league?.name ?? "esta liga"}? Esta accion no se puede deshacer.`
            : "Seguro que deseas eliminar este partido de la liga? Esta accion no se puede deshacer."
        }
        loading={deletingMatchId !== null}
        onCancel={() => {
          clearMutationError();
          modals.clearDeleteRequest();
        }}
        onConfirm={handleDelete}
      />
    </div>
  );
}
