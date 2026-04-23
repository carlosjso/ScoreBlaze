import { Plus, ShieldCheck, ShieldX, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { mockTeams } from "@/features/teams/data/mockTeams";
import { TeamDetailModal } from "@/features/teams/components/TeamDetailModal";
import { TeamFormModal } from "@/features/teams/components/TeamFormModal";
import type { Team } from "@/features/teams/types/team";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { Button, PageHeader, Panel, SearchInput, Select } from "@/shared/components/ui";

type SortKey = "id" | "name";
type SortDir = "asc" | "desc";

export default function TeamsPage() {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);

  const filteredTeams = useMemo<Team[]>(() => {
    const normalized = search.trim().toLowerCase();
    let base = [...teams];

    if (statusFilter !== "all") {
      base = base.filter((team) => team.status === statusFilter);
    }

    if (normalized) {
      base = base.filter(
        (team) =>
          String(team.id).includes(normalized) ||
          team.name.toLowerCase().includes(normalized) ||
          team.responsibleName.toLowerCase().includes(normalized) ||
          team.responsibleEmail.toLowerCase().includes(normalized) ||
          String(team.playersCount).includes(normalized) ||
          team.status.toLowerCase().includes(normalized)
      );
    }

    const sorted = [...base].sort((left, right) => {
      if (sortKey === "id") return left.id - right.id;
      return left.name.localeCompare(right.name, "es", { sensitivity: "base" });
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [search, sortDir, sortKey, statusFilter, teams]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const openCreate = () => {
    setMode("create");
    setEditingTeam(null);
    setFormOpen(true);
  };

  const openEdit = (team: Team) => {
    setMode("edit");
    setEditingTeam(team);
    setFormOpen(true);
  };

  const handleSubmit = (payload: Omit<Team, "id" | "playersCount">) => {
    if (mode === "create") {
      const nextId = teams.length ? Math.max(...teams.map((team) => team.id)) + 1 : 1;
      const newTeam: Team = {
        id: nextId,
        playersCount: 0,
        ...payload,
      };
      setTeams((prev) => [newTeam, ...prev]);
      setFormOpen(false);
      return;
    }

    if (!editingTeam) return;
    setTeams((prev) =>
      prev.map((team) => (team.id === editingTeam.id ? { ...team, ...payload } : team))
    );
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTeam) return;
    setTeams((prev) => prev.filter((team) => team.id !== deleteTeam.id));
    setDeleteTeam(null);
  };

  const totalPlayers = useMemo(
    () => teams.reduce((accumulator, currentTeam) => accumulator + currentTeam.playersCount, 0),
    [teams]
  );
  const activeTeams = useMemo(
    () => teams.filter((team) => team.status === "Activo").length,
    [teams]
  );
  const suspendedTeams = useMemo(
    () => teams.filter((team) => team.status === "Suspendido").length,
    [teams]
  );

  const minVisibleRows = 8;
  const emptyRowsCount = Math.max(0, minVisibleRows - filteredTeams.length);
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader
          title="Equipos"
          subtitle="Gestiona equipos de basquetbol, responsables y estado competitivo."
        />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Equipos</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{teams.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Jugadores</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{totalPlayers}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <ShieldCheck size={12} />
              Activos
            </p>
            <p className="mt-1 text-2xl font-bold text-emerald-700">{activeTeams}</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <ShieldX size={12} />
              Suspendidos
            </p>
            <p className="mt-1 text-2xl font-bold text-rose-700">{suspendedTeams}</p>
          </div>
        </div>

        <Panel>
          <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(280px,1.8fr)_minmax(160px,0.7fr)_auto] sm:items-center">
            <div className="w-full min-w-0">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar equipo o responsable" />
            </div>

            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full">
              <option value="all">Estatus: Todos</option>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Suspendido">Suspendido</option>
            </Select>

            <div className="sm:justify-self-end">
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
                Crear equipo
              </Button>
            </div>
          </div>

          <TableShell className="min-h-[500px]">
            <table className="w-full min-w-[930px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "330px" }} />
                <col style={{ width: "270px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "170px" }} />
              </colgroup>
              <thead>
                <tr className={tableHeaderClass}>
                  <th className={tableCellClass}>
                    <div className="flex items-center gap-3">
                      <SortHeaderButton
                        label="EQUIPO"
                        sortKey="name"
                        activeKey={sortKey}
                        direction={sortDir}
                        onToggle={toggleSort}
                      />
                      <SortHeaderButton
                        label="ID"
                        sortKey="id"
                        activeKey={sortKey}
                        direction={sortDir}
                        onToggle={toggleSort}
                      />
                    </div>
                  </th>
                  <th className={tableCellClass}>RESPONSABLE</th>
                  <th className={tableCellClass}>JUGADORES</th>
                  <th className={tableCellClass}>ESTADO</th>
                  <th className={`${tableCellClass} text-right`}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeams.map((team) => (
                  <tr key={team.id} className={tableRowClass}>
                    <td className={tableCellClass}>
                      <div className="flex items-center gap-3">
                        {team.logoUrl ? (
                          <img
                            src={team.logoUrl}
                            alt={`Logo ${team.name}`}
                            className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700">
                            {team.name
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold text-slate-900">{team.name}</p>
                          <p className="text-xs text-slate-500">ID #{team.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className={tableCellClass}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">{team.responsibleName}</p>
                        <p className="truncate text-xs text-slate-500">{team.responsibleEmail}</p>
                      </div>
                    </td>
                    <td className={tableCellClass}>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        <UsersRound size={12} />
                        {team.playersCount}
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <StatusBadge status={team.status} />
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <RowActions<Team>
                        row={team}
                        onView={(row) => setDetailTeam(row)}
                        onEdit={openEdit}
                        onManage={(row) => navigate(`/team-players?team=${row.id}`)}
                        onDelete={(row) => setDeleteTeam(row)}
                      />
                    </td>
                  </tr>
                ))}

                {filteredTeams.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center" colSpan={5}>
                      <TableEmptyState
                        mode={hasActiveFilters ? "filtered" : "empty"}
                        title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay equipos registrados"}
                        description={
                          hasActiveFilters
                            ? "Prueba con otra busqueda o limpia los filtros para volver a ver la lista completa."
                            : "Comienza creando tu primer equipo para gestionar responsables y plantilla."
                        }
                        actionLabel={hasActiveFilters ? "Limpiar filtros" : "Crear equipo"}
                        onAction={
                          hasActiveFilters
                            ? () => {
                                setSearch("");
                                setStatusFilter("all");
                              }
                            : openCreate
                        }
                      />
                    </td>
                  </tr>
                ) : null}

                {filteredTeams.length > 0
                  ? Array.from({ length: emptyRowsCount }).map((_, index) => (
                      <tr key={`empty-row-${index}`} className={tableRowClass}>
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

      <TeamFormModal
        isOpen={formOpen}
        mode={mode}
        initialTeam={editingTeam}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <TeamDetailModal team={detailTeam} isOpen={detailTeam !== null} onClose={() => setDetailTeam(null)} />

      <ConfirmModal
        isOpen={deleteTeam !== null}
        title="Eliminar equipo"
        message={
          deleteTeam
            ? `Seguro que deseas eliminar ${deleteTeam.name}. Esta accion no se puede deshacer.`
            : "Esta accion no se puede deshacer."
        }
        onCancel={() => setDeleteTeam(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
