import { Check, Mail, Phone, RotateCcw, Save, Shirt, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import { usePlayersData } from "@/features/players/hooks/usePlayersData";
import { usePlayersMutations } from "@/features/players/hooks/usePlayersMutations";
import type { PlayerListItem, TeamFilterValue } from "@/features/players/Players.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, PageHeader, Panel, SearchInput, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type TeamAssignmentFilter = TeamFilterValue | "assigned";

type TeamCardItem = {
  id: number;
  name: string;
  logoBase64: string | null;
  playerCount: number;
  selected: boolean;
};

function matchesTeamSearch(team: TeamCardItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return team.name.toLowerCase().includes(normalizedQuery) || String(team.id).includes(normalizedQuery);
}

function TeamCard({ team, onToggle, disabled }: { team: TeamCardItem; onToggle: (teamId: number) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(team.id)}
      className={cn(
        "group flex w-full items-center gap-4 rounded-[22px] border px-4 py-4 text-left transition-all duration-200",
        team.selected
          ? "border-orange-200 bg-orange-50/70 shadow-[0_14px_30px_rgba(249,115,22,0.12)]"
          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-[0_12px_24px_rgba(15,23,42,0.08)]",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      <TeamLogo
        name={team.name}
        logoBase64={team.logoBase64}
        seed={team.id}
        className="h-14 w-14 shrink-0 rounded-2xl text-xs"
        imageClassName="p-1"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{team.name}</p>
          {team.selected ? (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
              Seleccionado
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          {team.playerCount} {team.playerCount === 1 ? "jugador" : "jugadores"}
        </p>
      </div>

      <span
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition",
          team.selected
            ? "border-orange-200 bg-white text-orange-700"
            : "border-slate-200 bg-slate-50 text-slate-400 group-hover:border-orange-200 group-hover:text-orange-600"
        )}
      >
        <Check size={16} />
      </span>
    </button>
  );
}

export default function PlayerTeamAssignmentPage() {
  const navigate = useNavigate();
  const { playerId: playerIdParam } = useParams();
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<TeamAssignmentFilter>("all");
  const [draftTeamIds, setDraftTeamIds] = useState<number[]>([]);
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved">("idle");

  const numericPlayerId = Number(playerIdParam);
  const hasValidPlayerId = Number.isInteger(numericPlayerId) && numericPlayerId > 0;

  const { players, teams, loading, error } = usePlayersData();
  const { submitting, mutationError, clearMutationError, savePlayer } = usePlayersMutations();

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === numericPlayerId) ?? null,
    [numericPlayerId, players]
  );

  const originalTeamIds = selectedPlayer?.teamIds ?? [];
  const originalTeamIdsKey = originalTeamIds.join(",");

  useEffect(() => {
    setDraftTeamIds([...originalTeamIds]);
    setSearch("");
    setTeamFilter("all");
    setSaveFeedback("idle");
  }, [originalTeamIdsKey, selectedPlayer?.id]);

  const teamCards = useMemo(() => {
    const playerCountByTeamId = new Map<number, number>();

    players.forEach((player) => {
      player.teamIds.forEach((teamId) => {
        playerCountByTeamId.set(teamId, (playerCountByTeamId.get(teamId) ?? 0) + 1);
      });
    });

    return [...teams]
      .map<TeamCardItem>((team) => ({
        id: team.id,
        name: team.name,
        logoBase64: team.logo_base64,
        playerCount: playerCountByTeamId.get(team.id) ?? 0,
        selected: draftTeamIds.includes(team.id),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "es", { sensitivity: "base" }));
  }, [draftTeamIds, players, teams]);

  const filteredTeams = useMemo(() => {
    let nextTeams = [...teamCards];

    if (teamFilter === "none") {
      nextTeams = nextTeams.filter((team) => team.playerCount === 0);
    } else if (teamFilter === "assigned") {
      nextTeams = nextTeams.filter((team) => team.selected);
    } else if (teamFilter !== "all") {
      const filteredTeamId = Number(teamFilter);
      nextTeams = nextTeams.filter((team) => team.id === filteredTeamId);
    }

    return nextTeams.filter((team) => matchesTeamSearch(team, search));
  }, [search, teamCards, teamFilter]);

  const isDirty = draftTeamIds.join(",") !== originalTeamIdsKey;
  const panelError = mutationError ?? error;

  const toggleTeam = (teamId: number) => {
    clearMutationError();
    setDraftTeamIds((currentIds) =>
      currentIds.includes(teamId)
        ? currentIds.filter((id) => id !== teamId)
        : [...currentIds, teamId].sort((left, right) => left - right)
    );
  };

  const resetDraft = () => {
    clearMutationError();
    setDraftTeamIds([...originalTeamIds]);
  };

  const handleSave = async () => {
    if (!selectedPlayer) {
      return;
    }

    await savePlayer({
      mode: "edit",
      playerId: selectedPlayer.id,
      values: {
        name: selectedPlayer.name,
        email: selectedPlayer.email,
        phone: selectedPlayer.phone,
        photoBase64: selectedPlayer.photoBase64,
        teamIds: draftTeamIds,
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
          title="Asignar equipo"
          subtitle="Selecciona los equipos a los que pertenece este jugador."
          actions={
            <Button variant="outline" onClick={() => navigate("/players")}>
              Volver a jugadores
            </Button>
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
              Cargando jugador...
            </div>
          ) : teams.length === 0 ? (
            <TableEmptyState
              mode="empty"
              title="No hay equipos registrados"
              description="Primero crea equipos para poder asignarlos desde jugadores."
              actionLabel="Ir a equipos"
              onAction={() => navigate("/teams")}
            />
          ) : !hasValidPlayerId || !selectedPlayer ? (
            <TableEmptyState
              mode="filtered"
              title="Jugador no encontrado"
              description="El jugador que intentaste abrir ya no existe o el enlace es invalido."
              actionLabel="Volver a jugadores"
              onAction={() => navigate("/players")}
            />
          ) : (
            <>
              <section className="mb-5 rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <PlayerPhoto
                      name={selectedPlayer.name}
                      photoBase64={selectedPlayer.photoBase64}
                      className="h-20 w-20 shrink-0 rounded-[24px] text-base"
                      imageClassName="object-cover"
                      emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
                    />

                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
                        <Shirt size={12} />
                        Jugador #{selectedPlayer.id}
                      </span>
                      <h3 className="mt-3 text-[30px] leading-none text-slate-900 sm:text-[34px]">{selectedPlayer.name}</h3>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail size={12} />
                          {selectedPlayer.email}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Phone size={12} />
                          {selectedPlayer.phone || "Sin telefono"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      {draftTeamIds.length} {draftTeamIds.length === 1 ? "equipo" : "equipos"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-2 text-sm font-semibold",
                        isDirty
                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                          : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                      )}
                    >
                      {isDirty ? "Cambios pendientes" : "Todo guardado"}
                    </span>
                  </div>
                </div>
              </section>

              <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(280px,1.6fr)_220px] sm:items-center">
                <div className="w-full min-w-0">
                  <SearchInput value={search} onChange={setSearch} placeholder="Buscar equipo" />
                </div>

                <Select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value as TeamAssignmentFilter)}>
                  <option value="all">Equipos: Todos</option>
                  <option value="assigned">Equipos: Seleccionados</option>
                  <option value="none">Equipos: Sin jugadores</option>
                </Select>
              </div>

              <section className="mt-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                {filteredTeams.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredTeams.map((team) => (
                      <TeamCard key={team.id} team={team} onToggle={toggleTeam} disabled={submitting} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                    <TableEmptyState
                      mode={search.trim() || teamFilter !== "all" ? "filtered" : "empty"}
                      title={search.trim() || teamFilter !== "all" ? "Sin coincidencias" : "No hay equipos para mostrar"}
                      description={
                        search.trim() || teamFilter !== "all"
                          ? "Prueba con otra busqueda o cambia el filtro."
                          : "Todavia no hay equipos disponibles para asignar."
                      }
                    />
                  </div>
                )}
              </section>

              <div className="sticky bottom-4 z-10 mt-5">
                <div className="rounded-[24px] border border-slate-200 bg-white/95 px-4 py-4 shadow-lg backdrop-blur">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                        <UsersRound size={13} />
                        {isDirty ? "Hay cambios por guardar" : "Sin cambios pendientes"}
                      </span>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
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
                        <Save size={14} />
                        {submitting ? "Guardando..." : saveFeedback === "saved" && !isDirty ? "Guardado" : "Guardar"}
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
