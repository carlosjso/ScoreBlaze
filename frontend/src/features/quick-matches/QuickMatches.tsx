import { useDeferredValue, useMemo, useState } from "react";

import { QuickMatchDetailModal } from "@/features/quick-matches/components/QuickMatchDetailModal";
import { QuickMatchFormModal } from "@/features/quick-matches/components/QuickMatchFormModal";
import { QuickMatchesTable } from "@/features/quick-matches/components/QuickMatchesTable";
import { QuickMatchesToolbar } from "@/features/quick-matches/components/QuickMatchesToolbar";
import { useQuickMatchesData } from "@/features/quick-matches/hooks/useQuickMatchesData";
import { useQuickMatchesModals } from "@/features/quick-matches/hooks/useQuickMatchesModals";
import { useQuickMatchesMutations } from "@/features/quick-matches/hooks/useQuickMatchesMutations";
import type { MatchStatusFilter, SortDir, SortKey } from "@/features/quick-matches/QuickMatches.types";
import { matchStatusSortOrder } from "@/features/quick-matches/QuickMatches.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";

export default function QuickMatches() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MatchStatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const deferredSearch = useDeferredValue(search);

  const { matches, teams, loading, error } = useQuickMatchesData();
  const modals = useQuickMatchesModals();
  const {
    submitting,
    deletingMatchId,
    mutationError,
    clearMutationError,
    saveMatch,
    deleteMatch,
  } = useQuickMatchesMutations();

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
    setStatusFilter("all");
  };

  const openCreate = () => {
    clearMutationError();
    modals.openCreate();
  };

  const handleSubmit = async (values: Parameters<typeof saveMatch>[0]["values"]) => {
    await saveMatch({
      mode: modals.formMode,
      matchId: modals.editingMatch?.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleDelete = async () => {
    if (!modals.deleteMatch) return;

    try {
      await deleteMatch(modals.deleteMatch.id);
      modals.clearDeleteRequest();
    } catch {
      return;
    }
  };

  const panelError = mutationError ?? error;

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Partido rapido" subtitle="Programa partidos amistosos entre dos equipos." />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {!panelError && teams.length < 2 ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Necesitas al menos 2 equipos reales en el backend para programar partidos.
            </div>
          ) : null}

          <QuickMatchesToolbar
            search={search}
            statusFilter={statusFilter}
            disabled={loading || teams.length < 2}
            onSearchChange={setSearch}
            onStatusFilterChange={setStatusFilter}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <QuickMatchesTable
              matches={filteredMatches}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              hasActiveFilters={hasActiveFilters}
              deletingMatchId={deletingMatchId}
              onToggleSort={toggleSort}
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
        </Panel>
      </div>

      <QuickMatchFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialMatch={modals.editingMatch}
        teams={teams}
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
        onClose={modals.closeDetail}
      />

      <ConfirmModal
        isOpen={modals.deleteMatch !== null}
        title="Eliminar partido"
        message={
          modals.deleteMatch
            ? `Seguro que deseas eliminar ${modals.deleteMatch.matchupLabel}. Esta accion no se puede deshacer.`
            : "Seguro que deseas eliminar este partido. Esta accion no se puede deshacer."
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

