import {
  Check,
  LoaderCircle,
  Mail,
  Phone,
  RotateCcw,
  Save,
  Shirt,
  UserMinus,
  UserPlus,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { useTeamsData } from "@/features/teams/hooks/useTeamsData";
import { useTeamsMutations } from "@/features/teams/hooks/useTeamsMutations";
import type { ApiPlayer, TeamListItem } from "@/features/teams/Teams.types";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, PageHeader, Panel, SearchInput, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

function matchesSearch(player: ApiPlayer, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const phone = player.phone === null ? "" : String(player.phone);
  return (
    player.name.toLowerCase().includes(normalizedQuery) ||
    player.email.toLowerCase().includes(normalizedQuery) ||
    phone.includes(normalizedQuery) ||
    String(player.id).includes(normalizedQuery)
  );
}

function updateDraftWithPlayerIds(currentIds: number[], nextIds: number[]) {
  return [...new Set([...currentIds, ...nextIds])].sort((left, right) => left - right);
}

type RosterZone = "assigned" | "available";
type AvailablePlayerFilter = "all" | "without_team" | "with_other_teams";

function useTeamRosterSnapshot() {
  const { teamId: teamIdParam } = useParams();
  const selectedTeamId = Number(teamIdParam);
  const hasValidTeamId = Number.isInteger(selectedTeamId) && selectedTeamId > 0;
  const { teams, players, loading, error } = useTeamsData();

  const orderedPlayers = useMemo(
    () => [...players].sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" })),
    [players]
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id === selectedTeamId) ?? null,
    [selectedTeamId, teams]
  );

  return {
    selectedTeamId,
    hasValidTeamId,
    selectedTeam,
    teams,
    orderedPlayers,
    loading,
    error,
    teamCount: teams.length,
  };
}

type TeamHeaderCardProps = {
  team: TeamListItem;
  description?: string;
  rightSlot: ReactNode;
};

function TeamHeaderCard({ team, description, rightSlot }: TeamHeaderCardProps) {
  return (
    <section className="mb-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <TeamLogo
            name={team.name}
            logoBase64={team.logoBase64}
            seed={team.id}
            className="h-[72px] w-[72px] shrink-0 rounded-[24px] text-base sm:h-20 sm:w-20"
            imageClassName="p-2"
          />

          <div className="min-w-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
              <Shirt size={12} />
              Equipo #{team.id}
            </span>
            <h3 className="mt-3 text-[30px] leading-none text-slate-900 sm:text-[34px]">{team.name}</h3>
            {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <UsersRound size={12} />
                Responsable: {team.responsibleName || "Sin responsable"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail size={12} />
                {team.responsibleEmail || "Sin correo"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone size={12} />
                {team.responsiblePhone || "Sin telefono"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">{rightSlot}</div>
      </div>
    </section>
  );
}

type RosterMemberCardProps = {
  player: ApiPlayer;
};

function RosterMemberCard({ player }: RosterMemberCardProps) {
  const phone = player.phone === null ? "Sin telefono" : String(player.phone);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <PlayerPhoto
          name={player.name}
          photoBase64={player.photo_base64}
          className="h-12 w-12 shrink-0 rounded-2xl text-xs font-black"
          imageClassName="object-cover"
          emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{player.name}</p>
          <p className="truncate text-xs text-slate-500">{player.email}</p>
          <p className="mt-1 text-xs text-slate-400">{phone}</p>
        </div>
      </div>
    </article>
  );
}

type AnimatedCountBadgeProps = {
  value: number;
  label: string;
  tone?: "neutral" | "warning" | "success";
  pulse?: boolean;
  hideValue?: boolean;
};

function AnimatedCountBadge({
  value,
  label,
  tone = "neutral",
  pulse = false,
  hideValue = false,
}: AnimatedCountBadgeProps) {
  const [isBumping, setIsBumping] = useState(false);

  useEffect(() => {
    setIsBumping(true);
    const timeoutId = window.setTimeout(() => setIsBumping(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [value]);

  return (
    <span
      className={cn(
        "rounded-full border px-3 py-2 text-sm font-semibold transition-transform duration-200",
        tone === "neutral" && "border-slate-200 bg-white text-slate-700",
        tone === "warning" && "border-amber-200 bg-amber-50 text-amber-700",
        tone === "success" && "border-emerald-200 bg-emerald-50 text-emerald-700",
        isBumping && "scale-105",
        pulse && "animate-pulse"
      )}
    >
      {hideValue ? label : `${value} ${label}`}
    </span>
  );
}

type PlayerCardProps = {
  player: ApiPlayer;
  mode: "assigned" | "available";
  onAction: (playerId: number) => void;
  disabled?: boolean;
  statusLabel?: string;
  onDragStart: (playerId: number, zone: RosterZone) => void;
  onDragEnd: () => void;
};

function PlayerCard({
  player,
  mode,
  onAction,
  disabled = false,
  statusLabel,
  onDragStart,
  onDragEnd,
}: PlayerCardProps) {
  const phone = player.phone === null ? "Sin telefono" : String(player.phone);
  const isAssigned = mode === "assigned";

  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onClick={() => onAction(player.id)}
      onDragStart={() => onDragStart(player.id, mode)}
      onDragEnd={onDragEnd}
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
        <PlayerPhoto
          name={player.name}
          photoBase64={player.photo_base64}
          className="h-11 w-11 shrink-0 rounded-2xl text-xs font-black"
          imageClassName="object-cover"
          emptyClassName={cn(
            isAssigned ? "border-orange-200 bg-white text-orange-700" : "border-slate-200 bg-slate-100 text-slate-800"
          )}
        />

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{player.name}</p>
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
          <p className="truncate text-xs text-slate-500" title={player.email}>
            {player.email}
          </p>
          <p className="mt-1 text-xs text-slate-400">{phone}</p>
        </div>
      </div>

      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition duration-200 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100",
          isAssigned
            ? "border-slate-200 bg-white text-slate-700"
            : "border-orange-200 bg-orange-50 text-orange-700"
        )}
      >
        {isAssigned ? <UserMinus size={16} /> : <UserPlus size={16} />}
      </span>
    </button>
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

export default function TeamRosterPage() {
  const navigate = useNavigate();
  const { selectedTeamId, hasValidTeamId, selectedTeam, orderedPlayers, loading, error, teamCount } =
    useTeamRosterSnapshot();
  const [search, setSearch] = useState("");

  const rosterPlayerIdsKey = (selectedTeam?.playerIds ?? []).join(",");
  const rosterPlayerIds = useMemo(() => new Set(selectedTeam?.playerIds ?? []), [rosterPlayerIdsKey]);

  useEffect(() => {
    setSearch("");
  }, [selectedTeam?.id]);

  const rosterPlayers = useMemo(
    () => orderedPlayers.filter((player) => rosterPlayerIds.has(player.id) && matchesSearch(player, search)),
    [orderedPlayers, rosterPlayerIds, search]
  );

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Plantilla"
          subtitle="Consulta primero la plantilla actual de este equipo antes de editarla."
          actions={
            <Button variant="outline" onClick={() => navigate("/teams")}>
              Volver a equipos
            </Button>
          }
        />

        <Panel className="overflow-hidden p-5 sm:p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Cargando plantilla...
            </div>
          ) : teamCount === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay equipos registrados"
              description="Primero crea un equipo para poder consultar su plantilla."
              actionLabel="Ir a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : !hasValidTeamId || !selectedTeam ? (
            <TableEmptyState
              mode="filtered"
              title="Equipo no encontrado"
              description="El equipo que intentaste abrir ya no existe o el enlace es invalido."
              actionLabel="Volver a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : (
            <>
              <TeamHeaderCard
                team={selectedTeam}
                rightSlot={
                  <>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      {selectedTeam.playerIds.length} {selectedTeam.playerIds.length === 1 ? "jugador" : "jugadores"}
                    </span>
                    <Button variant="primary" onClick={() => navigate(`/teams/${selectedTeamId}/roster/manage`)}>
                      <UserPlus size={14} />
                      Buscar jugadores
                    </Button>
                  </>
                }
              />

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Tu plantilla</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Visualiza rapidamente los jugadores actuales del equipo.
                    </p>
                  </div>
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
                    {selectedTeam.playerIds.length} en plantilla
                  </span>
                </div>

                <div className="mt-4">
                  <SearchInput value={search} onChange={setSearch} placeholder="Buscar en plantilla" />
                </div>

                <div className="mt-5">
                  {rosterPlayers.length > 0 ? (
                    <div className="grid gap-3 xl:grid-cols-2">
                      {rosterPlayers.map((player) => (
                        <RosterMemberCard key={`roster-preview-${player.id}`} player={player} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                      <TableEmptyState
                        mode={search.trim() ? "filtered" : "empty"}
                        title={search.trim() ? "Sin coincidencias" : "Plantilla vacia"}
                        description={
                          search.trim()
                            ? "Prueba con otra busqueda para encontrar jugadores dentro de la plantilla."
                            : "Este equipo aun no tiene jugadores. Usa el boton Buscar jugadores para empezar a armarla."
                        }
                        actionLabel={!search.trim() ? "Buscar jugadores" : undefined}
                        onAction={!search.trim() ? () => navigate(`/teams/${selectedTeamId}/roster/manage`) : undefined}
                      />
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

export function TeamRosterManagePage() {
  const navigate = useNavigate();
  const { selectedTeamId, hasValidTeamId, selectedTeam, teams, orderedPlayers, loading, error, teamCount } =
    useTeamRosterSnapshot();
  const [availableSearch, setAvailableSearch] = useState("");
  const [assignedSearch, setAssignedSearch] = useState("");
  const [availableFilter, setAvailableFilter] = useState<AvailablePlayerFilter>("all");
  const [draftPlayerIds, setDraftPlayerIds] = useState<number[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<{ playerId: number; source: RosterZone } | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<RosterZone | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved">("idle");

  const { submitting, mutationError, clearMutationError, saveTeam } = useTeamsMutations();

  const originalPlayerIds = selectedTeam?.playerIds ?? [];
  const originalPlayerIdsKey = originalPlayerIds.join(",");

  useEffect(() => {
    setDraftPlayerIds([...originalPlayerIds]);
    setAvailableSearch("");
    setAssignedSearch("");
    setAvailableFilter("all");
    setSaveFeedback("idle");
  }, [selectedTeam?.id, originalPlayerIdsKey]);

  const draftPlayerIdsKey = draftPlayerIds.join(",");
  const originalAssignedIds = useMemo(() => new Set(originalPlayerIds), [originalPlayerIdsKey]);
  const draftAssignedIds = useMemo(() => new Set(draftPlayerIds), [draftPlayerIdsKey]);

  const addedPlayerIds = useMemo(
    () => draftPlayerIds.filter((playerId) => !originalAssignedIds.has(playerId)),
    [draftPlayerIds, originalAssignedIds]
  );
  const removedPlayerIds = useMemo(
    () => originalPlayerIds.filter((playerId) => !draftAssignedIds.has(playerId)),
    [draftAssignedIds, originalPlayerIds]
  );

  const assignedPlayers = useMemo(
    () =>
      orderedPlayers.filter(
        (player) => draftAssignedIds.has(player.id) && matchesSearch(player, assignedSearch)
      ),
    [assignedSearch, draftAssignedIds, orderedPlayers]
  );

  const otherTeamCountByPlayerId = useMemo(() => {
    const counts = new Map<number, number>();

    teams.forEach((team) => {
      if (team.id === selectedTeamId) {
        return;
      }

      team.playerIds.forEach((playerId) => {
        counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
      });
    });

    return counts;
  }, [selectedTeamId, teams]);

  const availablePlayers = useMemo(
    () => {
      let nextPlayers = orderedPlayers.filter((player) => !draftAssignedIds.has(player.id));

      if (availableFilter === "without_team") {
        nextPlayers = nextPlayers.filter((player) => (otherTeamCountByPlayerId.get(player.id) ?? 0) === 0);
      } else if (availableFilter === "with_other_teams") {
        nextPlayers = nextPlayers.filter((player) => (otherTeamCountByPlayerId.get(player.id) ?? 0) > 0);
      }

      return nextPlayers.filter((player) => matchesSearch(player, availableSearch));
    },
    [availableFilter, availableSearch, draftAssignedIds, orderedPlayers, otherTeamCountByPlayerId]
  );

  const isDirty = selectedTeam !== null && draftPlayerIdsKey !== originalPlayerIdsKey;
  const panelError = mutationError ?? error;
  const pendingChangeCount = addedPlayerIds.length + removedPlayerIds.length;

  const assignPlayer = (playerId: number) => {
    clearMutationError();
    setDraftPlayerIds((currentIds) => updateDraftWithPlayerIds(currentIds, [playerId]));
  };

  const unassignPlayer = (playerId: number) => {
    clearMutationError();
    setDraftPlayerIds((currentIds) => currentIds.filter((id) => id !== playerId));
  };

  const assignVisiblePlayers = () => {
    clearMutationError();
    setDraftPlayerIds((currentIds) =>
      updateDraftWithPlayerIds(
        currentIds,
        availablePlayers.map((player) => player.id)
      )
    );
  };

  const unassignVisiblePlayers = () => {
    const visibleAssignedIds = new Set(assignedPlayers.map((player) => player.id));
    clearMutationError();
    setDraftPlayerIds((currentIds) => currentIds.filter((id) => !visibleAssignedIds.has(id)));
  };

  const resetDraft = () => {
    clearMutationError();
    setDraftPlayerIds([...originalPlayerIds]);
  };

  const handleDragStart = (playerId: number, source: RosterZone) => {
    setDraggedPlayer({ playerId, source });
  };

  const handleDragEnd = () => {
    setDraggedPlayer(null);
    setActiveDropZone(null);
  };

  const handleDropToZone = (zone: RosterZone) => {
    if (!draggedPlayer || draggedPlayer.source === zone) {
      handleDragEnd();
      return;
    }

    if (zone === "assigned") {
      assignPlayer(draggedPlayer.playerId);
    } else {
      unassignPlayer(draggedPlayer.playerId);
    }

    handleDragEnd();
  };

  const handleSave = async () => {
    if (!selectedTeam) {
      return;
    }

    await saveTeam({
      mode: "edit",
      teamId: selectedTeam.id,
      values: {
        name: selectedTeam.name,
        responsibleName: selectedTeam.responsibleName,
        responsiblePhone: selectedTeam.responsiblePhone,
        responsibleEmail: selectedTeam.responsibleEmail,
        logoBase64: selectedTeam.logoBase64,
        playerIds: draftPlayerIds,
      },
    });

    setSaveFeedback("saved");
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
          title="Asignar jugadores"
          subtitle="Aqui incorporas o retiras jugadores del equipo desde el listado general de jugadores."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  navigate(selectedTeam ? `/teams/${selectedTeam.id}/roster` : "/teams")
                }
              >
                Volver a plantilla
              </Button>
              <Button variant="ghost" onClick={() => navigate("/teams")}>
                Equipos
              </Button>
            </div>
          }
        />

        <Panel className="overflow-hidden p-5 sm:p-6">
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              Cargando plantilla...
            </div>
          ) : teamCount === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay equipos registrados"
              description="Primero crea un equipo para poder gestionar su plantilla."
              actionLabel="Ir a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : !hasValidTeamId || !selectedTeam ? (
            <TableEmptyState
              mode="filtered"
              title="Equipo no encontrado"
              description="El equipo que intentaste abrir ya no existe o el enlace es invalido."
              actionLabel="Volver a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : (
            <>
              <TeamHeaderCard
                team={selectedTeam}
                rightSlot={
                  <>
                    <AnimatedCountBadge value={draftPlayerIds.length} label="en plantilla" />
                    <AnimatedCountBadge value={availablePlayers.length} label="por asignar" />
                    <AnimatedCountBadge
                      value={pendingChangeCount}
                      label={isDirty ? "sin guardar" : "todo guardado"}
                      tone={isDirty ? "warning" : "success"}
                      pulse={!isDirty && saveFeedback === "saved"}
                      hideValue={!isDirty}
                    />
                  </>
                }
              />

              <div className="grid gap-5 xl:grid-cols-2">
                <section
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedPlayer?.source === "available") {
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
                    title="Plantilla actual"
                    count={assignedPlayers.length}
                    actionLabel="Quitar filtrados"
                    onAction={unassignVisiblePlayers}
                    disabled={submitting || assignedPlayers.length === 0}
                  />

                  <div className="mt-4">
                    <SearchInput
                      value={assignedSearch}
                      onChange={setAssignedSearch}
                      placeholder="Buscar en plantilla"
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Arrastra jugadores aqui para incorporarlos al equipo o toca una tarjeta para moverla.
                  </p>

                  <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto pr-1">
                    {assignedPlayers.length > 0 ? (
                      assignedPlayers.map((player) => (
                        <PlayerCard
                          key={`assigned-${player.id}`}
                          player={player}
                          mode="assigned"
                          statusLabel={!originalAssignedIds.has(player.id) ? "Nuevo" : undefined}
                          onAction={unassignPlayer}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          disabled={submitting}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                        <TableEmptyState
                          mode={assignedSearch.trim() ? "filtered" : "empty"}
                          title={assignedSearch.trim() ? "Sin coincidencias" : "Plantilla vacia"}
                          description={
                            assignedSearch.trim()
                              ? "Prueba otra busqueda."
                              : "Asigna jugadores desde la columna de jugadores registrados."
                          }
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section
                  onDragOver={(event) => {
                    event.preventDefault();
                    if (draggedPlayer?.source === "assigned") {
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
                    title="Jugadores"
                    count={availablePlayers.length}
                    actionLabel="Asignar filtrados"
                    onAction={assignVisiblePlayers}
                    disabled={submitting || availablePlayers.length === 0}
                  />

                  <div className="mt-4 grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)]">
                    <Select
                      value={availableFilter}
                      onChange={(event) => setAvailableFilter(event.target.value as AvailablePlayerFilter)}
                    >
                      <option value="all">Filtro: Todos</option>
                      <option value="without_team">Filtro: Sin equipo</option>
                      <option value="with_other_teams">Filtro: Con otros equipos</option>
                    </Select>

                    <SearchInput
                      value={availableSearch}
                      onChange={setAvailableSearch}
                      placeholder="Buscar jugadores"
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    Aqui aparecen jugadores que todavia no forman parte de esta plantilla.
                  </p>

                  <div className="mt-4 max-h-[540px] space-y-3 overflow-y-auto pr-1">
                    {availablePlayers.length > 0 ? (
                      availablePlayers.map((player) => (
                        <PlayerCard
                          key={`available-${player.id}`}
                          player={player}
                          mode="available"
                          statusLabel={originalAssignedIds.has(player.id) ? "Quitado" : undefined}
                          onAction={assignPlayer}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          disabled={submitting}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white">
                        <TableEmptyState
                          mode={availableSearch.trim() ? "filtered" : "empty"}
                          title={availableSearch.trim() || availableFilter !== "all" ? "Sin coincidencias" : "Sin jugadores por asignar"}
                          description={
                            availableSearch.trim() || availableFilter !== "all"
                              ? "Prueba otra busqueda."
                              : "Todos los jugadores registrados ya forman parte de esta plantilla."
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

                      {addedPlayerIds.length > 0 ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                          +{addedPlayerIds.length} alta(s)
                        </span>
                      ) : null}

                      {removedPlayerIds.length > 0 ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700">
                          -{removedPlayerIds.length} baja(s)
                        </span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="outline" onClick={() => navigate(`/teams/${selectedTeamId}/roster`)}>
                        Volver a plantilla
                      </Button>
                      <Button variant="outline" onClick={resetDraft} disabled={submitting || !isDirty}>
                        <RotateCcw size={14} />
                        Descartar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSave}
                        disabled={submitting || !isDirty}
                        className="disabled:cursor-not-allowed disabled:opacity-45 disabled:saturate-50 disabled:shadow-none"
                      >
                        {submitting ? <LoaderCircle size={14} className="animate-spin" /> : null}
                        {!submitting && saveFeedback === "saved" && !isDirty ? <Check size={14} /> : null}
                        {!submitting && !(saveFeedback === "saved" && !isDirty) ? <Save size={14} /> : null}
                        {submitting
                          ? "Guardando..."
                          : saveFeedback === "saved" && !isDirty
                            ? "Guardado"
                            : "Guardar plantilla"}
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
