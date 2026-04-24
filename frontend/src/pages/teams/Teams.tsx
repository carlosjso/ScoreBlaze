import { ShieldCheck, ShieldX, UsersRound } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { TeamDetailModal } from "@/pages/teams/components/TeamDetailModal";
import { TeamFormModal } from "@/pages/teams/components/TeamFormModal";
import { TeamsTable } from "@/pages/teams/components/TeamsTable";
import { TeamsToolbar } from "@/pages/teams/components/TeamsToolbar";
import { useTeamsData } from "@/pages/teams/hooks/useTeamsData";
import { useTeamsModals } from "@/pages/teams/hooks/useTeamsModals";
import { useTeamsMutations } from "@/pages/teams/hooks/useTeamsMutations";
import type { SortDir, SortKey, TeamRosterFilter } from "@/pages/teams/Teams.types";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { PageHeader, Panel } from "@/shared/components/ui";

export default function Teams() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [rosterFilter, setRosterFilter] = useState<TeamRosterFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const deferredSearch = useDeferredValue(search);

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

  const filteredTeams = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    let baseTeams = [...teams];

    if (rosterFilter === "with_players") {
      baseTeams = baseTeams.filter((team) => team.playerCount > 0);
    } else if (rosterFilter === "without_players") {
      baseTeams = baseTeams.filter((team) => team.playerCount === 0);
    }

    if (normalizedSearch) {
      baseTeams = baseTeams.filter((team) => {
        const playersText = team.players.map((player) => `${player.name} ${player.email}`.toLowerCase()).join(" ");
        return (
          String(team.id).includes(normalizedSearch) ||
          team.name.toLowerCase().includes(normalizedSearch) ||
          String(team.playerCount).includes(normalizedSearch) ||
          team.rosterStatus.toLowerCase().includes(normalizedSearch) ||
          playersText.includes(normalizedSearch)
        );
      });
    }

    const sortedTeams = [...baseTeams].sort((left, right) => {
      if (sortKey === "id") return left.id - right.id;
      if (sortKey === "players") return left.playerCount - right.playerCount;
      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });

    return sortDir === "asc" ? sortedTeams : sortedTeams.reverse();
  }, [deferredSearch, rosterFilter, sortDir, sortKey, teams]);

  const hasActiveFilters = Boolean(search.trim()) || rosterFilter !== "all";

  const totalTeams = teams.length;
  const totalAssignments = useMemo(
    () => teams.reduce((total, team) => total + team.playerCount, 0),
    [teams]
  );
  const uniquePlayersAssigned = useMemo(
    () => new Set(teams.flatMap((team) => team.playerIds)).size,
    [teams]
  );
  const teamsWithoutPlayers = useMemo(
    () => teams.filter((team) => team.playerCount === 0).length,
    [teams]
  );

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
    setRosterFilter("all");
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
      <div className="sb-page-shell">
        <PageHeader
          title="Equipos"
          subtitle="Gestiona equipos reales y sus plantillas a partir del backend de ScoreBlaze."
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Equipos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalTeams}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Asignaciones</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalAssignments}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <ShieldCheck size={12} />
              Jugadores vinculados
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{uniquePlayersAssigned}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <ShieldX size={12} />
              Sin jugadores
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-700">{teamsWithoutPlayers}</p>
          </div>
        </div>

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          <TeamsToolbar
            search={search}
            rosterFilter={rosterFilter}
            onSearchChange={setSearch}
            onRosterFilterChange={setRosterFilter}
            onCreate={openCreate}
          />

          <div className="mt-4">
            <TeamsTable
              teams={filteredTeams}
              loading={loading}
              sortKey={sortKey}
              sortDir={sortDir}
              hasActiveFilters={hasActiveFilters}
              deletingTeamId={deletingTeamId}
              onToggleSort={toggleSort}
              onClearFilters={resetFilters}
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
        </Panel>
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
