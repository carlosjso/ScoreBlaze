import { CalendarDays, Check, LayoutGrid, Mail, Minus, Plus, RotateCcw, Save, Trash2, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PlayerDetailModal } from "@/features/players/components/PlayerDetailModal";
import { useLeaguePlayerParticipation } from "@/features/leagues/hooks/useLeaguePlayerParticipation";
import { useLeagueTeamScopedStats } from "@/features/leagues/hooks/useLeagueTeamScopedStats";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { usePlayersData } from "@/features/players/hooks/usePlayersData";
import type { PlayerListItem } from "@/features/players/Players.types";
import { useLeaguesData } from "@/features/leagues/hooks/useLeaguesData";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import type { LeagueListItem } from "@/features/leagues/Leagues.types";
import { TeamDetailModal } from "@/features/teams/components/TeamDetailModal";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { useTeamsData } from "@/features/teams/hooks/useTeamsData";
import type { TeamListItem } from "@/features/teams/Teams.types";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { Button, PageHeader, Panel, SearchInput } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

function matchesTeamSearch(team: TeamListItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return (
    String(team.id).includes(normalizedQuery) ||
    team.name.toLowerCase().includes(normalizedQuery) ||
    team.responsibleName.toLowerCase().includes(normalizedQuery) ||
    team.responsibleEmail.toLowerCase().includes(normalizedQuery) ||
    team.playersLabel.toLowerCase().includes(normalizedQuery)
  );
}

function normalizeTeamIds(teamIds: number[]) {
  return [...new Set(teamIds)];
}

function shuffleIds(teamIds: number[]) {
  const nextIds = [...teamIds];

  for (let index = nextIds.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextIds[index], nextIds[swapIndex]] = [nextIds[swapIndex], nextIds[index]];
  }

  return nextIds;
}

function useLeagueTeamsSnapshot() {
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;

  const { leagues, loading: leaguesLoading, error: leaguesError } = useLeaguesData();
  const { teams, loading: teamsLoading, error: teamsError } = useTeamsData();

  const orderedTeams = useMemo(
    () => [...teams].sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })),
    [teams]
  );

  const selectedLeague = useMemo(
    () => leagues.find((league) => league.id === selectedLeagueId) ?? null,
    [leagues, selectedLeagueId]
  );

  return {
    selectedLeagueId,
    hasValidLeagueId,
    leagues,
    teams,
    orderedTeams,
    selectedLeague,
    loading: leaguesLoading || teamsLoading,
    error: leaguesError ?? teamsError,
  };
}

type StatBadgeProps = {
  value: number;
  label: string;
  tone?: "neutral" | "warning" | "success";
  hideValue?: boolean;
};

function StatBadge({ value, label, tone = "neutral", hideValue = false }: StatBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full border px-3 py-2 text-sm font-semibold",
        tone === "neutral" && "border-slate-200 bg-white text-slate-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {hideValue ? label : `${value} ${label}`}
    </span>
  );
}

type ColumnHeaderProps = {
  title: string;
  count: number;
  actionLabel: string;
  onAction: () => void;
  disabled: boolean;
};

function ColumnHeader({ title, count, actionLabel, onAction, disabled }: ColumnHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
          {count}
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={onAction} disabled={disabled} className="rounded-full">
        {actionLabel}
      </Button>
    </div>
  );
}

type LeagueHeaderCardProps = {
  league: LeagueListItem;
  rightSlot: ReactNode;
};

function LeagueHeaderCard({ league, rightSlot }: LeagueHeaderCardProps) {
  return (
    <section className="mb-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <TeamLogo
            name={league.name}
            logoBase64={league.logoBase64}
            seed={league.id}
            className="h-[72px] w-[72px] shrink-0 rounded-[24px] text-base sm:h-20 sm:w-20"
            imageClassName="p-2"
          />

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
                <LayoutGrid size={12} />
                Liga #{league.id}
              </span>
              <StatusBadge status={league.status} />
            </div>

            <h3 className="mt-3 max-w-full truncate text-[30px] leading-none text-slate-900 sm:text-[34px]" title={league.name}>
              {league.name}
            </h3>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <UsersRound size={12} />
                Responsable: {league.responsibleName || "Sin responsable"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail size={12} />
                {league.responsibleEmail || "Sin correo"}
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 [overflow-wrap:anywhere]">
                <LayoutGrid size={12} />
                Categoria: {league.category || "Sin categoria"}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {league.startDate || "Sin fecha de inicio"} - {league.endDate || "Sin fecha de fin"}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {league.trackedStats.map((stat) => (
                <span key={stat} className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                  {stat}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">{rightSlot}</div>
      </div>
    </section>
  );
}

type LeagueTeamCardProps = {
  team: TeamListItem;
  mode: "assigned" | "available";
  onAction: (teamId: number) => void;
  statusLabel?: string;
  disabled?: boolean;
  onDragStart: (teamId: number, zone: "assigned" | "available") => void;
  onDragEnd: () => void;
};

function LeagueTeamCard({
  team,
  mode,
  onAction,
  statusLabel,
  disabled = false,
  onDragStart,
  onDragEnd,
}: LeagueTeamCardProps) {
  const isAssigned = mode === "assigned";

  return (
    <button
      type="button"
      draggable={!disabled}
      onClick={() => onAction(team.id)}
      onDragStart={() => onDragStart(team.id, mode)}
      onDragEnd={onDragEnd}
      disabled={disabled}
      className={cn(
        "group relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border px-3 py-3 text-left transition-all duration-200",
        isAssigned
          ? "border-slate-200 bg-slate-50 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/60 hover:shadow-[0_14px_32px_rgba(249,115,22,0.12)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-[0_14px_32px_rgba(249,115,22,0.12)]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-orange-500 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="min-w-0 flex items-center gap-3">
        <TeamLogo
          name={team.name}
          logoBase64={team.logoBase64}
          seed={team.id}
          className="h-11 w-11 shrink-0 rounded-2xl text-xs font-black"
          imageClassName="p-0.5"
          emptyClassName={cn(
            isAssigned ? "border-orange-200 bg-white text-orange-700" : "border-slate-200 bg-slate-100 text-slate-800"
          )}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{team.name}</p>
            {statusLabel ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  isAssigned ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                )}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>

          <p className="truncate text-xs text-slate-500">{team.responsibleName || "Sin responsable"}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span>{team.playerCount} jugadores</span>
            <span>{team.rosterStatus}</span>
          </div>
        </div>
      </div>

      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100",
          isAssigned ? "border-slate-200 bg-white text-slate-700" : "border-orange-200 bg-orange-50 text-orange-700"
        )}
      >
        {isAssigned ? <Minus size={16} /> : <Plus size={16} />}
      </span>
    </button>
  );
}

export default function LeagueTeamsPage() {
  const navigate = useNavigate();
  const {
    selectedLeagueId,
    hasValidLeagueId,
    leagues,
    teams,
    orderedTeams,
    selectedLeague,
    loading,
    error,
  } = useLeagueTeamsSnapshot();
  const { players: leaguePlayers, error: playersError } = usePlayersData();
  const { assigningTeamsLeagueId, mutationErrorMessage, clearMutationError, replaceLeagueTeams } = useLeaguesMutations();
  const [search, setSearch] = useState("");
  const [pendingTeamAction, setPendingTeamAction] = useState<TeamListItem | null>(null);
  const [detailTeam, setDetailTeam] = useState<TeamListItem | null>(null);
  const [detailPlayer, setDetailPlayer] = useState<PlayerListItem | null>(null);
  const [detailPlayerTeamContext, setDetailPlayerTeamContext] = useState<{
    teamId: number;
    teamName: string;
  } | null>(null);
  const detailTeamStatsQuery = useLeagueTeamScopedStats({
    leagueId: hasValidLeagueId ? selectedLeagueId : null,
    leagueName: selectedLeague?.name ?? null,
    teamId: detailTeam?.id ?? null,
  });
  const detailPlayerParticipationQuery = useLeaguePlayerParticipation({
    leagueId: hasValidLeagueId ? selectedLeagueId : null,
    leagueName: selectedLeague?.name ?? null,
    teamId: detailPlayerTeamContext?.teamId ?? null,
    teamName: detailPlayerTeamContext?.teamName ?? null,
    playerId: detailPlayer?.id ?? null,
  });

  const assignedTeamIdsSource = useMemo(() => selectedLeague?.teamIds ?? [], [selectedLeague?.teamIds]);
  const assignedTeamIds = useMemo(() => new Set(assignedTeamIdsSource), [assignedTeamIdsSource]);
  const teamById = useMemo(() => new Map(orderedTeams.map((team) => [team.id, team])), [orderedTeams]);
  const playerById = useMemo(() => new Map(leaguePlayers.map((player) => [player.id, player])), [leaguePlayers]);

  useEffect(() => {
    setSearch("");
    setPendingTeamAction(null);
    setDetailTeam(null);
    setDetailPlayer(null);
    setDetailPlayerTeamContext(null);
  }, [selectedLeague?.id]);

  const assignedTeams = useMemo(
    () =>
      (selectedLeague?.teamIds ?? [])
        .map((teamId) => teamById.get(teamId))
        .filter((team): team is TeamListItem => Boolean(team))
        .filter((team) => assignedTeamIds.has(team.id) && matchesTeamSearch(team, search)),
    [assignedTeamIds, search, selectedLeague?.teamIds, teamById]
  );

  const canShuffleTeams = selectedLeague?.status === "Sin empezar" && (selectedLeague?.teamIds.length ?? 0) > 1;
  const usesSuspensionFlow = selectedLeague !== null && selectedLeague.status !== "Sin empezar";
  const previewEmptyRows = Math.max(0, 6 - assignedTeams.length);
  const queryError = error;
  const panelError = mutationErrorMessage ?? queryError ?? playersError;
  const isSavingTeams = selectedLeague !== null && assigningTeamsLeagueId === selectedLeague.id;

  const handleShuffleTeams = async () => {
    if (!selectedLeague || !canShuffleTeams) {
      return;
    }

    try {
      await replaceLeagueTeams(selectedLeague.id, shuffleIds(selectedLeague.teamIds));
    } catch {
      return;
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    if (!selectedLeague) {
      return;
    }

    try {
      await replaceLeagueTeams(
        selectedLeague.id,
        selectedLeague.teamIds.filter((id) => id !== teamId),
      );
      setPendingTeamAction(null);
    } catch {
      return;
    }
  };

  const handleTeamAction = (team: TeamListItem) => {
    if (usesSuspensionFlow) {
      setPendingTeamAction(team);
      return;
    }

    void handleRemoveTeam(team.id);
  };

  const handleOpenTeamDetail = (team: TeamListItem) => {
    setDetailTeam(team);
  };

  const handleOpenPlayerDetail = (playerId: number) => {
    const player = playerById.get(playerId);
    if (!player || !detailTeam) {
      return;
    }

    setDetailPlayerTeamContext({
      teamId: detailTeam.id,
      teamName: detailTeam.name,
    });
    setDetailTeam(null);
    setDetailPlayer(player);
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Equipos"
          subtitle="Consulta primero los equipos actuales de esta liga antes de editarla o ajustar su calendario."
          actions={<LeagueSectionNav leagueId={selectedLeague?.id} active="teams" />}
        />

        <Panel className="overflow-hidden p-5 sm:p-6">
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Cargando equipos de la liga...
            </div>
          ) : queryError ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No pudimos cargar los equipos de la liga en este momento.
            </div>
          ) : leagues.length === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay ligas registradas"
              description="Primero crea una liga para poder asignarle equipos."
              actionLabel="Ir a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : !hasValidLeagueId || !selectedLeague ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="La liga que intentaste abrir ya no existe o el enlace es invalido."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : teams.length === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay equipos registrados"
              description="Primero crea equipos para poder asignarlos a esta liga."
              actionLabel="Ir a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : (
            <>
              <LeagueHeaderCard
                league={selectedLeague}
                rightSlot={
                  <>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      {selectedLeague.teamIds.length} {selectedLeague.teamIds.length === 1 ? "equipo" : "equipos"}
                    </span>
                    {selectedLeague.status === "Sin empezar" ? (
                      <Button variant="outline" onClick={() => void handleShuffleTeams()} disabled={!canShuffleTeams || isSavingTeams}>
                        Sortear
                      </Button>
                    ) : null}
                    <Button variant="ghost" onClick={() => navigate(`/leagues/${selectedLeagueId}/matches`)}>
                      <CalendarDays size={14} />
                      Partidos
                    </Button>
                    <Button variant="primary" onClick={() => navigate(`/leagues/${selectedLeagueId}/teams/manage`)} disabled={isSavingTeams}>
                      <Plus size={14} />
                      Buscar equipos
                    </Button>
                  </>
                }
              />

              <div
                className={cn(
                  "mb-5 rounded-2xl border px-4 py-3 text-sm",
                  selectedLeague.status === "Sin empezar"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-amber-200 bg-amber-50 text-amber-800"
                )}
              >
                {selectedLeague.status === "Sin empezar"
                  ? "La liga aun no inicia. Aqui puedes quitar equipos o usar Sortear para previsualizar el calendario."
                  : "La liga ya comenzo o termino. Si retiras un equipo desde esta tabla, primero se abrira el modal de suspension."}
              </div>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 rounded-full border border-slate-200 bg-white px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Nombre de la liga
                      </p>
                      <p className="truncate text-sm font-semibold text-slate-900" title={selectedLeague.name}>
                        {selectedLeague.name}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        {assignedTeams.length} visibles
                      </span>
                      {selectedLeague.status === "Sin empezar" ? (
                        <Button variant="primary" size="sm" onClick={() => void handleShuffleTeams()} disabled={!canShuffleTeams || isSavingTeams}>
                          Sortear
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Equipos en la liga</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Revisa los equipos actuales y administra la salida desde la ultima columna.
                    </p>
                  </div>
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Buscar equipos asignados"
                    className="w-full max-w-sm"
                  />
                </div>

                <div className="mt-5">
                  {assignedTeams.length > 0 ? (
                    <TableShell className="min-h-[360px] rounded-[24px] border border-slate-200">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr className={tableHeaderClass}>
                            <th className={tableCellClass}>LOGO</th>
                            <th className={tableCellClass}>ID</th>
                            <th className={tableCellClass}>NOMBRE</th>
                            <th className={tableCellClass}>RESPONSABLE</th>
                            <th className={tableCellClass}>JUGADORES</th>
                            <th className={`${tableCellClass} text-right`}>
                              {usesSuspensionFlow ? "SUSPENDER" : "QUITAR"}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignedTeams.map((team) => (
                            <tr
                              key={`league-team-row-${team.id}`}
                              className={cn(tableRowClass, "cursor-pointer transition hover:bg-orange-50/40")}
                              onClick={() => handleOpenTeamDetail(team)}
                            >
                              <td className={tableCellClass}>
                                <TeamLogo
                                  name={team.name}
                                  logoBase64={team.logoBase64}
                                  seed={team.id}
                                  className="h-12 w-12 rounded-2xl text-xs font-black"
                                  imageClassName="p-1"
                                  emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
                                />
                              </td>
                              <td className={`${tableCellClass} font-semibold text-slate-800`}>{team.id}</td>
                              <td className={tableCellClass}>
                                <div className="min-w-[180px]">
                                  <p className="font-semibold text-slate-900">{team.name}</p>
                                  <p className="mt-1 text-xs text-slate-400">{team.rosterStatus}</p>
                                </div>
                              </td>
                              <td className={tableCellClass}>
                                <div className="min-w-[220px]">
                                  <p className="font-medium text-slate-700">{team.responsibleName || "Sin responsable"}</p>
                                  <p className="mt-1 text-xs text-slate-400">{team.responsibleEmail || "Sin correo"}</p>
                                </div>
                              </td>
                              <td className={tableCellClass}>
                                <div className="min-w-[120px]">
                                  <p className="font-semibold text-slate-800">
                                    {team.playerCount} {team.playerCount === 1 ? "jugador" : "jugadores"}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">{team.playersLabel}</p>
                                </div>
                              </td>
                              <td className={`${tableCellClass} text-right`}>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleTeamAction(team);
                                  }}
                                  disabled={isSavingTeams}
                                  className={cn(
                                    "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50",
                                    usesSuspensionFlow
                                      ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                      : "border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                                  )}
                                  aria-label={`${usesSuspensionFlow ? "Suspender" : "Quitar"} ${team.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {previewEmptyRows > 0
                            ? Array.from({ length: previewEmptyRows }, (_, index) => (
                                <tr key={`league-preview-empty-${index}`} className={tableRowClass}>
                                  <td className={tableCellClass}>&nbsp;</td>
                                  <td className={tableCellClass}>&nbsp;</td>
                                  <td className={tableCellClass}>&nbsp;</td>
                                  <td className={tableCellClass}>&nbsp;</td>
                                  <td className={tableCellClass}>&nbsp;</td>
                                  <td className={tableCellClass}>&nbsp;</td>
                                </tr>
                              ))
                            : null}
                        </tbody>
                      </table>
                    </TableShell>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                      <TableEmptyState
                        mode={search.trim() ? "filtered" : "empty"}
                        title={search.trim() ? "Sin coincidencias" : "Liga sin equipos"}
                        description={
                          search.trim()
                            ? "Prueba con otra busqueda para encontrar equipos dentro de la liga."
                            : "Esta liga aun no tiene equipos. Usa el boton Buscar equipos para empezar a armarla."
                        }
                        actionLabel={!search.trim() ? "Buscar equipos" : undefined}
                        onAction={!search.trim() ? () => navigate(`/leagues/${selectedLeagueId}/teams/manage`) : undefined}
                      />
                    </div>
                  )}
                </div>
              </section>

              <ConfirmModal
                isOpen={pendingTeamAction !== null}
                title="Suspender equipo"
                message={
                  pendingTeamAction
                    ? `Seguro que quieres suspender a ${pendingTeamAction.name} de esta liga? En este flujo de front se retirara del listado actual.`
                    : ""
                }
                confirmText="Suspender"
                loading={isSavingTeams}
                onCancel={() => {
                  clearMutationError();
                  setPendingTeamAction(null);
                }}
                onConfirm={() => {
                  if (!pendingTeamAction) {
                    return;
                  }

                  void handleRemoveTeam(pendingTeamAction.id);
                }}
              />

              <TeamDetailModal
                team={detailTeam}
                isOpen={detailTeam !== null}
                onClose={() => setDetailTeam(null)}
                onPlayerClick={handleOpenPlayerDetail}
                stats={detailTeamStatsQuery.data ?? null}
                statsLoading={detailTeam !== null && detailTeamStatsQuery.loading}
                statsError={detailTeam !== null ? detailTeamStatsQuery.error : null}
              />

              <PlayerDetailModal
                player={detailPlayer}
                isOpen={detailPlayer !== null}
                onClose={() => {
                  setDetailPlayer(null);
                  setDetailPlayerTeamContext(null);
                }}
                leagueParticipation={
                  detailPlayer && detailPlayerTeamContext
                    ? {
                        leagueName: selectedLeague?.name ?? "Liga actual",
                        teamName: detailPlayerTeamContext.teamName,
                        playerMatchesPlayed: detailPlayerParticipationQuery.data?.playerMatchesPlayed ?? 0,
                        teamMatchesPlayed: detailPlayerParticipationQuery.data?.teamMatchesPlayed ?? 0,
                        participationRate: detailPlayerParticipationQuery.data?.participationRate ?? null,
                        rankingPosition: detailPlayerParticipationQuery.data?.rankingPosition ?? null,
                        totalPoints: detailPlayerParticipationQuery.data?.totalPoints ?? 0,
                        made1pt: detailPlayerParticipationQuery.data?.made1pt ?? 0,
                        made2pt: detailPlayerParticipationQuery.data?.made2pt ?? 0,
                        made3pt: detailPlayerParticipationQuery.data?.made3pt ?? 0,
                        missedShots: detailPlayerParticipationQuery.data?.missedShots ?? 0,
                        totalAssists: detailPlayerParticipationQuery.data?.totalAssists ?? 0,
                        totalRebounds: detailPlayerParticipationQuery.data?.totalRebounds ?? 0,
                        totalFouls: detailPlayerParticipationQuery.data?.totalFouls ?? 0,
                        trackedStats: detailPlayerParticipationQuery.data?.trackedStats ?? [],
                        loading: detailPlayerParticipationQuery.loading,
                        error: detailPlayerParticipationQuery.error,
                      }
                    : null
                }
              />
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function LeagueTeamsManagePage() {
  const navigate = useNavigate();
  const {
    hasValidLeagueId,
    leagues,
    teams,
    orderedTeams,
    selectedLeague,
    loading,
    error,
  } = useLeagueTeamsSnapshot();
  const { assigningTeamsLeagueId, mutationErrorMessage, clearMutationError, replaceLeagueTeams } = useLeaguesMutations();
  const [availableSearch, setAvailableSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [draftTeamIds, setDraftTeamIds] = useState<number[]>([]);
  const [draggedTeam, setDraggedTeam] = useState<{ teamId: number; source: "assigned" | "available" } | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<"assigned" | "available" | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved">("idle");

  const originalTeamIds = useMemo(() => selectedLeague?.teamIds ?? [], [selectedLeague?.teamIds]);
  const originalTeamIdsKey = originalTeamIds.join(",");

  useEffect(() => {
    setDraftTeamIds(normalizeTeamIds(originalTeamIds));
  }, [originalTeamIds, selectedLeague?.id]);

  useEffect(() => {
    setAvailableSearch("");
    setAssignedSearch("");
    setDraggedTeam(null);
    setActiveDropZone(null);
    setSaveFeedback("idle");
  }, [selectedLeague?.id]);

  const draftTeamIdsKey = draftTeamIds.join(",");
  const originalAssignedIds = useMemo(() => new Set(originalTeamIds), [originalTeamIds]);
  const draftAssignedIds = useMemo(() => new Set(draftTeamIds), [draftTeamIds]);

  const assignedTeams = useMemo(
    () => orderedTeams.filter((team) => draftAssignedIds.has(team.id) && matchesTeamSearch(team, assignedSearch)),
    [assignedSearch, draftAssignedIds, orderedTeams]
  );

  const availableTeams = useMemo(
    () => orderedTeams.filter((team) => !draftAssignedIds.has(team.id) && matchesTeamSearch(team, availableSearch)),
    [availableSearch, draftAssignedIds, orderedTeams]
  );

  const addedTeamIds = useMemo(
    () => draftTeamIds.filter((teamId) => !originalAssignedIds.has(teamId)),
    [draftTeamIds, originalAssignedIds]
  );

  const removedTeamIds = useMemo(
    () => originalTeamIds.filter((teamId) => !draftAssignedIds.has(teamId)),
    [draftAssignedIds, originalTeamIds]
  );

  const isDirty = selectedLeague !== null && draftTeamIdsKey !== originalTeamIdsKey;
  const pendingChangeCount = addedTeamIds.length + removedTeamIds.length;
  const queryError = error;
  const panelError = mutationErrorMessage ?? queryError;
  const isSavingTeams = selectedLeague !== null && assigningTeamsLeagueId === selectedLeague.id;

  const assignTeam = (teamId: number) => {
    clearMutationError();
    setDraftTeamIds((current) => normalizeTeamIds([...current, teamId]));
    setSaveFeedback("idle");
  };

  const unassignTeam = (teamId: number) => {
    clearMutationError();
    setDraftTeamIds((current) => current.filter((id) => id !== teamId));
    setSaveFeedback("idle");
  };

  const assignVisibleTeams = () => {
    clearMutationError();
    setDraftTeamIds((current) => normalizeTeamIds([...current, ...availableTeams.map((team) => team.id)]));
    setSaveFeedback("idle");
  };

  const unassignVisibleTeams = () => {
    const visibleAssignedIds = new Set(assignedTeams.map((team) => team.id));
    clearMutationError();
    setDraftTeamIds((current) => current.filter((id) => !visibleAssignedIds.has(id)));
    setSaveFeedback("idle");
  };

  const resetDraft = () => {
    clearMutationError();
    setDraftTeamIds(normalizeTeamIds(originalTeamIds));
    setSaveFeedback("idle");
  };

  const handleDragStart = (teamId: number, source: "assigned" | "available") => {
    setDraggedTeam({ teamId, source });
  };

  const handleDragEnd = () => {
    setDraggedTeam(null);
    setActiveDropZone(null);
  };

  const handleDropToZone = (zone: "assigned" | "available") => {
    if (!draggedTeam || draggedTeam.source === zone) {
      handleDragEnd();
      return;
    }

    if (zone === "assigned") {
      assignTeam(draggedTeam.teamId);
    } else {
      unassignTeam(draggedTeam.teamId);
    }

    handleDragEnd();
  };

  const handleSave = async () => {
    if (!selectedLeague) {
      return;
    }

    try {
      await replaceLeagueTeams(selectedLeague.id, draftTeamIds);
      setSaveFeedback("saved");
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (saveFeedback !== "saved") {
      return;
    }

    const timeoutId = window.setTimeout(() => setSaveFeedback("idle"), 1600);
    return () => window.clearTimeout(timeoutId);
  }, [saveFeedback]);

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Asignar equipos"
          subtitle="Aqui incorporas o retiras equipos de la liga desde el listado general de equipos."
          actions={<LeagueSectionNav leagueId={selectedLeague?.id} />}
        />

        <Panel className="overflow-hidden p-5 sm:p-6">
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Cargando equipos de la liga...
            </div>
          ) : queryError ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No pudimos cargar la gestion de equipos en este momento.
            </div>
          ) : leagues.length === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay ligas registradas"
              description="Primero crea una liga para poder asignarle equipos."
              actionLabel="Ir a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : !hasValidLeagueId || !selectedLeague ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="La liga que intentaste abrir ya no existe o el enlace es invalido."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : teams.length === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay equipos registrados"
              description="Primero crea equipos para poder asignarlos a esta liga."
              actionLabel="Ir a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : (
            <>
              <LeagueHeaderCard
                league={selectedLeague}
                rightSlot={
                  <>
                    <StatBadge value={draftTeamIds.length} label="en liga" />
                    <StatBadge value={availableTeams.length} label="disponibles" />
                    <StatBadge
                      value={pendingChangeCount}
                      label={isDirty ? "sin guardar" : "todo guardado"}
                      tone={isDirty ? "warning" : "success"}
                      hideValue={!isDirty}
                    />
                  </>
                }
              />

              {draftTeamIds.length < 2 ? (
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Se recomiendan al menos 2 equipos para que la liga quede lista, pero puedes seguir revisando el flujo en front.
                </div>
              ) : null}

              <div className="grid gap-5 xl:grid-cols-2">
                <section
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedTeam?.source === "available") {
                      setActiveDropZone("assigned");
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDropToZone("assigned");
                  }}
                  className={cn(
                    "rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200",
                    activeDropZone === "assigned" && "border-orange-300 bg-orange-50/40 shadow-[0_0_0_4px_rgba(249,115,22,0.08)]"
                  )}
                >
                  <ColumnHeader
                    title="Equipos en la liga"
                    count={assignedTeams.length}
                    actionLabel="Quitar filtrados"
                    onAction={unassignVisibleTeams}
                    disabled={isSavingTeams || assignedTeams.length === 0}
                  />

                  <div className="mt-4">
                    <SearchInput
                      value={assignedSearch}
                      onChange={setAssignedSearch}
                      placeholder="Buscar equipos asignados"
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Arrastra equipos aqui para incorporarlos a la liga o toca una tarjeta para retirarla.
                  </p>

                  <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto pr-1">
                    {assignedTeams.length > 0 ? (
                      assignedTeams.map((team) => (
                        <LeagueTeamCard
                          key={`assigned-team-${team.id}`}
                          team={team}
                          mode="assigned"
                          statusLabel={!originalAssignedIds.has(team.id) ? "Nuevo" : undefined}
                          onAction={unassignTeam}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          disabled={isSavingTeams}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                        <TableEmptyState
                          mode={assignedSearch.trim() ? "filtered" : "empty"}
                          title={assignedSearch.trim() ? "Sin coincidencias" : "Liga sin equipos"}
                          description={
                            assignedSearch.trim()
                              ? "Prueba otra busqueda para encontrar equipos dentro de la liga."
                              : "Agrega equipos desde la columna de disponibles."
                          }
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedTeam?.source === "assigned") {
                      setActiveDropZone("available");
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleDropToZone("available");
                  }}
                  className={cn(
                    "rounded-[28px] border border-slate-200 bg-slate-50 p-5 shadow-sm transition-all duration-200",
                    activeDropZone === "available" && "border-orange-300 bg-orange-100/40 shadow-[0_0_0_4px_rgba(249,115,22,0.08)]"
                  )}
                >
                  <ColumnHeader
                    title="Equipos disponibles"
                    count={availableTeams.length}
                    actionLabel="Agregar filtrados"
                    onAction={assignVisibleTeams}
                    disabled={isSavingTeams || availableTeams.length === 0}
                  />

                  <div className="mt-4">
                    <SearchInput
                      value={availableSearch}
                      onChange={setAvailableSearch}
                      placeholder="Buscar equipos"
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Busca y arrastra equipos disponibles a la liga desde esta columna.
                  </p>

                  <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto pr-1">
                    {availableTeams.length > 0 ? (
                      availableTeams.map((team) => (
                        <LeagueTeamCard
                          key={`available-team-${team.id}`}
                          team={team}
                          mode="available"
                          statusLabel={originalAssignedIds.has(team.id) ? "Quitado" : undefined}
                          onAction={assignTeam}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          disabled={isSavingTeams}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
                        <TableEmptyState
                          mode={availableSearch.trim() ? "filtered" : "empty"}
                          title={availableSearch.trim() ? "Sin coincidencias" : "Sin equipos por agregar"}
                          description={
                            availableSearch.trim()
                              ? "Prueba otra busqueda."
                              : "Todos los equipos registrados ya forman parte de esta liga."
                          }
                        />
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="sticky bottom-4 z-10 mt-5">
                <div
                  className={cn(
                    "rounded-[24px] border px-4 py-4 shadow-lg backdrop-blur",
                    isDirty ? "border-amber-200 bg-white/95" : "border-slate-200 bg-white/95"
                  )}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
                          isDirty ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <UsersRound size={13} />
                        {isDirty ? `${pendingChangeCount} cambios pendientes` : "Sin cambios pendientes"}
                      </span>

                      {addedTeamIds.length > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          +{addedTeamIds.length} alta(s)
                        </span>
                      ) : null}

                      {removedTeamIds.length > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          -{removedTeamIds.length} baja(s)
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => navigate(selectedLeague ? `/leagues/${selectedLeague.id}/teams` : "/leagues")}>
                        Volver a equipos
                      </Button>
                      <Button variant="outline" onClick={resetDraft} disabled={isSavingTeams || !isDirty}>
                        <RotateCcw size={14} />
                        Descartar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => void handleSave()}
                        disabled={isSavingTeams || !isDirty}
                        className="disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50 disabled:shadow-none"
                      >
                        {isSavingTeams ? <Save size={14} /> : saveFeedback === "saved" && !isDirty ? <Check size={14} /> : <Save size={14} />}
                        {isSavingTeams ? "Guardando..." : saveFeedback === "saved" && !isDirty ? "Guardado" : "Guardar equipos"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
