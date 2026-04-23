import { Plus, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { PlayerDetailModal } from "@/features/players/components/PlayerDetailModal";
import { PlayerFormModal } from "@/features/players/components/PlayerFormModal";
import { mockPlayers } from "@/features/players/data/mockPlayers";
import { getPlayerStatus, type Player } from "@/features/players/types/player";
import { TeamDetailModal } from "@/features/teams/components/TeamDetailModal";
import { mockTeams } from "@/features/teams/data/mockTeams";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { Button, Modal, PageHeader, Panel, SearchInput, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type SortKey = "id" | "name";
type SortDir = "asc" | "desc";
type FormMode = "create" | "edit";
type TeamFilterValue = "all" | "none" | `${number}`;

const statusClass: Record<"Con equipo" | "Sin equipo", string> = {
  "Con equipo": "bg-emerald-100 text-emerald-700",
  "Sin equipo": "bg-slate-200 text-slate-700",
};

export default function TeamPlayersPage() {
  const [params] = useSearchParams();
  const queryTeam = Number(params.get("team"));
  const hasValidQueryTeam = Number.isInteger(queryTeam) && mockTeams.some((team) => team.id === queryTeam);

  const [teamFilter, setTeamFilter] = useState<TeamFilterValue>(hasValidQueryTeam ? String(queryTeam) as `${number}` : "all");
  const [players, setPlayers] = useState<Player[]>(mockPlayers);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);
  const [detailTeam, setDetailTeam] = useState<(typeof mockTeams)[number] | null>(null);
  const [deletePlayer, setDeletePlayer] = useState<Player | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedToAssign, setSelectedToAssign] = useState<number[]>([]);
  const [assignTargetTeamId, setAssignTargetTeamId] = useState<number | null>(
    hasValidQueryTeam ? queryTeam : (mockTeams[0]?.id ?? null)
  );

  const teamById = useMemo(() => new Map(mockTeams.map((team) => [team.id, team])), []);

  const selectedTeamId = useMemo(() => {
    if (teamFilter === "all" || teamFilter === "none") return null;
    const parsed = Number(teamFilter);
    return Number.isInteger(parsed) ? parsed : null;
  }, [teamFilter]);

  const assignTargetTeamName = assignTargetTeamId ? teamById.get(assignTargetTeamId)?.name ?? "" : "";

  useEffect(() => {
    if (selectedTeamId !== null) {
      setAssignTargetTeamId(selectedTeamId);
    }
  }, [selectedTeamId]);

  const filteredPlayers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let base = [...players];

    if (teamFilter === "none") {
      base = base.filter((player) => player.teamId === null);
    } else if (selectedTeamId !== null) {
      base = base.filter((player) => player.teamId === selectedTeamId);
    }

    if (normalized) {
      base = base.filter((player) => {
        const teamName = player.teamId ? teamById.get(player.teamId)?.name.toLowerCase() ?? "" : "";
        const playerStatus = getPlayerStatus(player).toLowerCase();
        return (
          String(player.id).includes(normalized) ||
          player.name.toLowerCase().includes(normalized) ||
          player.email.toLowerCase().includes(normalized) ||
          player.phone.toLowerCase().includes(normalized) ||
          player.position.toLowerCase().includes(normalized) ||
          playerStatus.includes(normalized) ||
          teamName.includes(normalized)
        );
      });
    }

    const sorted = [...base].sort((left, right) => {
      if (sortKey === "id") return left.id - right.id;
      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [players, search, selectedTeamId, sortDir, sortKey, teamById, teamFilter]);

  const availablePlayers = useMemo(
    () => players.filter((player) => player.teamId === null).sort((left, right) => left.id - right.id),
    [players]
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const toggleAssignSelection = (playerId: number) => {
    setSelectedToAssign((prev) => (prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]));
  };

  const assignSelectedPlayers = () => {
    if (!assignTargetTeamId || !selectedToAssign.length) return;
    setPlayers((prev) =>
      prev.map((player) =>
        selectedToAssign.includes(player.id)
          ? { ...player, teamId: assignTargetTeamId }
          : player
      )
    );
    setSelectedToAssign([]);
    setAssignOpen(false);
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingPlayer(null);
    setFormOpen(true);
  };

  const openEdit = (player: Player) => {
    setFormMode("edit");
    setEditingPlayer(player);
    setFormOpen(true);
  };

  const submitPlayer = (payload: Omit<Player, "id">) => {
    if (formMode === "create") {
      const nextId = players.length ? Math.max(...players.map((player) => player.id)) + 1 : 1;
      const newPlayer: Player = {
        id: nextId,
        ...payload,
      };
      setPlayers((prev) => [newPlayer, ...prev]);
      setFormOpen(false);
      return;
    }

    if (!editingPlayer) return;
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === editingPlayer.id
          ? {
              ...player,
              ...payload,
            }
          : player
      )
    );
    setFormOpen(false);
  };

  const removePlayer = () => {
    if (!deletePlayer) return;
    setPlayers((prev) => prev.filter((player) => player.id !== deletePlayer.id));
    setDeletePlayer(null);
  };

  const minVisibleRows = 8;
  const emptyRowsCount = Math.max(0, minVisibleRows - filteredPlayers.length);
  const hasActiveFilters = Boolean(search.trim()) || teamFilter !== "all";

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Jugadores" subtitle="Gestiona altas, asignaciones y estatus de jugadores por equipo." />

        <Panel>
          <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(220px,1fr)_minmax(280px,1.6fr)_auto_auto] sm:items-center">
            <Select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value as TeamFilterValue)}>
              <option value="all">Equipo: Todos</option>
              <option value="none">Equipo: Sin equipo</option>
              {mockTeams.map((team) => (
                <option key={team.id} value={String(team.id)}>
                  {team.name}
                </option>
              ))}
            </Select>

            <div className="w-full min-w-0">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, correo, posicion o equipo" />
            </div>

            <Button variant="outline" size="sm" leftIcon={<UserPlus size={14} />} onClick={openCreate}>
              Crear jugador
            </Button>

            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setAssignOpen(true)}
            >
              Asignar disponibles
            </Button>
          </div>

          <TableShell className="min-h-[500px]">
            <table className="w-full min-w-[980px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "64px" }} />
                <col style={{ width: "170px" }} />
                <col style={{ width: "190px" }} />
                <col style={{ width: "120px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "140px" }} />
              </colgroup>
              <thead>
                <tr className={tableHeaderClass}>
                  <th className={tableCellClass}>
                    <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={toggleSort} />
                  </th>
                  <th className={tableCellClass}>
                    <SortHeaderButton
                      label="NOMBRE"
                      sortKey="name"
                      activeKey={sortKey}
                      direction={sortDir}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className={tableCellClass}>CORREO</th>
                  <th className={tableCellClass}>TELEFONO</th>
                  <th className={tableCellClass}>POSICION</th>
                  <th className={tableCellClass}>ESTATUS</th>
                  <th className={tableCellClass}>EQUIPO</th>
                  <th className={`${tableCellClass} text-right`}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.map((player) => {
                  const team = player.teamId ? teamById.get(player.teamId) : null;
                  const playerStatus = getPlayerStatus(player);
                  return (
                    <tr key={player.id} className={tableRowClass}>
                      <td className={tableCellClass}>{player.id}</td>
                      <td className={`${tableCellClass} truncate`} title={player.name}>
                        {player.name}
                      </td>
                      <td className={`${tableCellClass} truncate`} title={player.email}>
                        {player.email}
                      </td>
                      <td className={`${tableCellClass} truncate`} title={player.phone}>
                        {player.phone}
                      </td>
                      <td className={`${tableCellClass} truncate`} title={player.position}>
                        {player.position}
                      </td>
                      <td className={tableCellClass}>
                        <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusClass[playerStatus])}>
                          {playerStatus}
                        </span>
                      </td>
                      <td className={tableCellClass}>
                        {team ? (
                          <span className="truncate text-sm text-slate-700" title={team.name}>
                            {team.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Sin equipo</span>
                        )}
                      </td>
                      <td className={`${tableCellClass} text-right`}>
                        <RowActions<Player>
                          row={player}
                          onView={(row) => setDetailPlayer(row)}
                          onEdit={openEdit}
                          onManage={team ? () => setDetailTeam(team) : undefined}
                          manageLabel="Ver equipo"
                          onDelete={(row) => setDeletePlayer(row)}
                        />
                      </td>
                    </tr>
                  );
                })}

                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center" colSpan={8}>
                      <TableEmptyState
                        mode={hasActiveFilters ? "filtered" : "empty"}
                        title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay jugadores registrados"}
                        description={
                          hasActiveFilters
                            ? "Prueba otra busqueda o limpia filtros para volver a ver todos los jugadores."
                            : "Crea tu primer jugador o asigna disponibles para iniciar la plantilla."
                        }
                        actionLabel={hasActiveFilters ? "Limpiar filtros" : "Crear jugador"}
                        onAction={
                          hasActiveFilters
                            ? () => {
                                setSearch("");
                                setTeamFilter("all");
                              }
                            : openCreate
                        }
                      />
                    </td>
                  </tr>
                ) : null}

                {filteredPlayers.length > 0
                  ? Array.from({ length: emptyRowsCount }).map((_, index) => (
                      <tr key={`empty-row-${index}`} className={tableRowClass}>
                        <td className={tableCellClass}>&nbsp;</td>
                        <td className={tableCellClass}>&nbsp;</td>
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
        </Panel>
      </div>

      <PlayerFormModal
        isOpen={formOpen}
        mode={formMode}
        initialPlayer={editingPlayer}
        teams={mockTeams}
        defaultTeamId={selectedTeamId}
        onClose={() => setFormOpen(false)}
        onSubmit={submitPlayer}
      />

      <Modal
        isOpen={assignOpen}
        onClose={() => {
          setAssignOpen(false);
          setSelectedToAssign([]);
        }}
        title="Jugadores disponibles"
        maxWidthClassName="max-w-4xl"
      >
        <p className="mb-4 text-sm text-slate-600">
          {assignTargetTeamId ? (
            <>
              Selecciona jugadores para asignar al equipo <strong>{assignTargetTeamName}</strong>.
            </>
          ) : (
            "Selecciona un equipo destino para asignar jugadores."
          )}
        </p>

        <div className="mb-3 max-w-[300px]">
          <Select
            label="Equipo destino"
            value={assignTargetTeamId !== null ? String(assignTargetTeamId) : "none"}
            onChange={(event) => {
              const value = event.target.value === "none" ? null : Number(event.target.value);
              setAssignTargetTeamId(value);
            }}
          >
            <option value="none">Selecciona equipo</option>
            {mockTeams.map((team) => (
              <option key={team.id} value={String(team.id)}>
                {team.name}
              </option>
            ))}
          </Select>
        </div>

        <TableShell>
          <table className="w-full min-w-[860px] table-fixed border-collapse">
            <colgroup>
              <col style={{ width: "80px" }} />
              <col style={{ width: "230px" }} />
              <col style={{ width: "230px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "120px" }} />
            </colgroup>
            <thead>
              <tr className={tableHeaderClass}>
                <th className={tableCellClass}>ID</th>
                <th className={tableCellClass}>NOMBRE</th>
                <th className={tableCellClass}>CORREO</th>
                <th className={tableCellClass}>POSICION</th>
                <th className={`${tableCellClass} text-center`}>SELECCIONAR</th>
              </tr>
            </thead>
            <tbody>
              {availablePlayers.map((player) => (
                <tr key={player.id} className={tableRowClass}>
                  <td className={tableCellClass}>{player.id}</td>
                  <td className={`${tableCellClass} truncate`} title={player.name}>
                    {player.name}
                  </td>
                  <td className={`${tableCellClass} truncate`} title={player.email}>
                    {player.email}
                  </td>
                  <td className={`${tableCellClass} truncate`} title={player.position}>
                    {player.position}
                  </td>
                  <td className={`${tableCellClass} text-center`}>
                    <input
                      type="checkbox"
                      checked={selectedToAssign.includes(player.id)}
                      onChange={() => toggleAssignSelection(player.id)}
                      disabled={!assignTargetTeamId}
                    />
                  </td>
                </tr>
              ))}

              {availablePlayers.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center" colSpan={5}>
                    <TableEmptyState
                      mode="empty"
                      title="No hay jugadores disponibles"
                      description="Todos los jugadores ya tienen equipo asignado."
                    />
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </TableShell>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setAssignOpen(false);
              setSelectedToAssign([]);
            }}
          >
            Cancelar
          </Button>
          <Button variant="primary" disabled={!assignTargetTeamId || !selectedToAssign.length} onClick={assignSelectedPlayers}>
            Asignar
          </Button>
        </div>
      </Modal>

      <PlayerDetailModal player={detailPlayer} isOpen={detailPlayer !== null} onClose={() => setDetailPlayer(null)} />
      <TeamDetailModal team={detailTeam} isOpen={detailTeam !== null} onClose={() => setDetailTeam(null)} />

      <ConfirmModal
        isOpen={deletePlayer !== null}
        title="Eliminar jugador"
        message={
          deletePlayer
            ? `Seguro que quieres eliminar a ${deletePlayer.name}. Esta accion no se puede deshacer.`
            : "Seguro que quieres eliminar este jugador. Esta accion no se puede deshacer."
        }
        onCancel={() => setDeletePlayer(null)}
        onConfirm={removePlayer}
      />
    </div>
  );
}
