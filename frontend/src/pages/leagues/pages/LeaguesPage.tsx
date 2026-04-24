import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { mockLeagues } from "@/pages/leagues/data/mockLeagues";
import type { League, LeagueStatus } from "@/pages/leagues/types/league";
import { mockTeams } from "@/pages/teams/data/mockTeams";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { Button, Input, Modal, PageHeader, Panel, SearchInput, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type SortKey = "id" | "name" | "category" | "status";
type SortDir = "asc" | "desc";

type LeagueForm = Omit<League, "id">;

const emptyForm: LeagueForm = {
  name: "",
  category: "",
  status: "Sin empezar",
  startDate: "",
  endDate: "",
  teamIds: [],
};

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>(mockLeagues);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [detailLeague, setDetailLeague] = useState<League | null>(null);
  const [deleteLeague, setDeleteLeague] = useState<League | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [form, setForm] = useState<LeagueForm>(emptyForm);

  const teamById = useMemo(() => new Map(mockTeams.map((team) => [team.id, team])), []);

  const filteredLeagues = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let base = [...leagues];

    if (statusFilter !== "all") {
      base = base.filter((league) => league.status === statusFilter);
    }

    if (normalized) {
      base = base.filter((league) => {
        const teamNames = league.teamIds
          .map((teamId) => teamById.get(teamId)?.name.toLowerCase() ?? "")
          .join(" ");
        return (
          String(league.id).includes(normalized) ||
          league.name.toLowerCase().includes(normalized) ||
          league.category.toLowerCase().includes(normalized) ||
          league.status.toLowerCase().includes(normalized) ||
          league.startDate.toLowerCase().includes(normalized) ||
          league.endDate.toLowerCase().includes(normalized) ||
          teamNames.includes(normalized)
        );
      });
    }

    const sorted = [...base].sort((left, right) => {
      if (sortKey === "id") return left.id - right.id;
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      return String(leftValue).localeCompare(String(rightValue), "es", { sensitivity: "base" });
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [leagues, search, sortDir, sortKey, statusFilter, teamById]);

  const canSubmitForm =
    form.name.trim() && form.category.trim() && form.startDate && form.endDate && form.teamIds.length > 1;

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const toggleTeamInForm = (teamId: number) => {
    setForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((id) => id !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingLeague(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (league: League) => {
    setFormMode("edit");
    setEditingLeague(league);
    setForm({
      name: league.name,
      category: league.category,
      status: league.status,
      startDate: league.startDate,
      endDate: league.endDate,
      teamIds: league.teamIds,
    });
    setFormOpen(true);
  };

  const submitForm = () => {
    if (!canSubmitForm) return;

    if (formMode === "create") {
      const nextId = leagues.length ? Math.max(...leagues.map((league) => league.id)) + 1 : 1;
      const newLeague: League = { id: nextId, ...form };
      setLeagues((prev) => [newLeague, ...prev]);
      setFormOpen(false);
      return;
    }

    if (!editingLeague) return;
    setLeagues((prev) => prev.map((league) => (league.id === editingLeague.id ? { ...league, ...form } : league)));
    setFormOpen(false);
  };

  const removeLeague = () => {
    if (!deleteLeague) return;
    setLeagues((prev) => prev.filter((league) => league.id !== deleteLeague.id));
    setDeleteLeague(null);
  };

  const totalLeagues = leagues.length;
  const activeLeagues = leagues.filter((league) => league.status === "En curso").length;
  const pendingLeagues = leagues.filter((league) => league.status === "Sin empezar").length;
  const finishedLeagues = leagues.filter((league) => league.status === "Finalizada").length;

  const minVisibleRows = 7;
  const emptyRowsCount = Math.max(0, minVisibleRows - filteredLeagues.length);
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Ligas" subtitle="Gestiona ligas, categoria, fechas y equipos participantes." />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-300 bg-white p-3 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Ligas</p>
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
          <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(280px,1.8fr)_minmax(180px,0.8fr)_auto] sm:items-center">
            <div className="w-full min-w-0">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por nombre, categoria o equipo" />
            </div>

            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full">
              <option value="all">Estatus: Todos</option>
              <option value="En curso">En curso</option>
              <option value="Sin empezar">Sin empezar</option>
              <option value="Finalizada">Finalizada</option>
            </Select>

            <div className="sm:justify-self-end">
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
                Crear liga
              </Button>
            </div>
          </div>

          <TableShell className="min-h-[460px]">
            <table className="w-full min-w-[1030px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "80px" }} />
                <col style={{ width: "280px" }} />
                <col style={{ width: "220px" }} />
                <col style={{ width: "160px" }} />
                <col style={{ width: "140px" }} />
                <col style={{ width: "150px" }} />
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
                  <th className={tableCellClass}>
                    <SortHeaderButton
                      label="CATEGORIA"
                      sortKey="category"
                      activeKey={sortKey}
                      direction={sortDir}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className={tableCellClass}>EQUIPOS</th>
                  <th className={tableCellClass}>
                    <SortHeaderButton
                      label="ESTATUS"
                      sortKey="status"
                      activeKey={sortKey}
                      direction={sortDir}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className={`${tableCellClass} text-right`}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeagues.map((league) => (
                  <tr key={league.id} className={tableRowClass}>
                    <td className={tableCellClass}>{league.id}</td>
                    <td className={tableCellClass}>
                      <p className="truncate font-medium text-slate-900" title={league.name}>
                        {league.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {league.startDate} - {league.endDate}
                      </p>
                    </td>
                    <td className={`${tableCellClass} truncate`} title={league.category}>
                      {league.category}
                    </td>
                    <td className={tableCellClass}>
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                        {league.teamIds.length} equipos
                      </span>
                    </td>
                    <td className={tableCellClass}>
                      <StatusBadge status={league.status} />
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <RowActions<League>
                        row={league}
                        onView={(row) => setDetailLeague(row)}
                        onEdit={openEdit}
                        onDelete={(row) => setDeleteLeague(row)}
                      />
                    </td>
                  </tr>
                ))}

                {filteredLeagues.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center" colSpan={6}>
                      <TableEmptyState
                        mode={hasActiveFilters ? "filtered" : "empty"}
                        title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay ligas registradas"}
                        description={
                          hasActiveFilters
                            ? "Cambia los filtros de busqueda para encontrar ligas disponibles."
                            : "Crea tu primera liga para configurar fechas, categoria y equipos."
                        }
                        actionLabel={hasActiveFilters ? "Limpiar filtros" : "Crear liga"}
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

                {filteredLeagues.length > 0
                  ? Array.from({ length: emptyRowsCount }).map((_, index) => (
                      <tr key={`empty-row-${index}`} className={tableRowClass}>
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

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === "create" ? "Crear liga" : "Editar liga"}
        maxWidthClassName="max-w-3xl"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label="Nombre de la liga"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Liga Municipal Primavera"
          />
          <Input
            label="Categoria"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
            placeholder="Basquet varonil"
          />
          <Select
            label="Estatus"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as LeagueStatus }))}
          >
            <option value="Sin empezar">Sin empezar</option>
            <option value="En curso">En curso</option>
            <option value="Finalizada">Finalizada</option>
          </Select>
          <Input
            label="Fecha de inicio"
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
          />
          <Input
            label="Fecha de fin"
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-slate-600">Equipos participantes</p>
          <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-xl border border-slate-300 bg-white p-3 sm:grid-cols-2">
            {mockTeams.map((team) => {
              const active = form.teamIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => toggleTeamInForm(team.id)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left text-sm transition",
                    active
                      ? "border-orange-300 bg-orange-50 text-slate-900"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  )}
                >
                  <p className="font-medium">{team.name}</p>
                  <p className="text-xs text-slate-500">{team.playersCount} jugadores</p>
                </button>
              );
            })}
          </div>
          {form.teamIds.length < 2 ? (
            <p className="mt-2 text-xs font-semibold text-rose-600">Selecciona al menos 2 equipos para crear la liga.</p>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setFormOpen(false)}>
            Cancelar
          </Button>
          <Button variant="secondary" disabled={!canSubmitForm} onClick={submitForm}>
            Guardar
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={detailLeague !== null}
        onClose={() => setDetailLeague(null)}
        title="Detalle de liga"
        maxWidthClassName="max-w-2xl"
      >
        {detailLeague ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input label="Nombre" value={detailLeague.name} disabled />
            <Input label="Categoria" value={detailLeague.category} disabled />
            <Input label="Fecha de inicio" value={detailLeague.startDate} disabled />
            <Input label="Fecha de fin" value={detailLeague.endDate} disabled />
            <Input label="Estatus" value={detailLeague.status} disabled />

            <div className="sm:col-span-2">
              <p className="mb-2 text-xs font-semibold text-slate-600">Equipos asignados</p>
              <div className="flex flex-wrap gap-2 rounded-xl border border-slate-300 bg-white p-3">
                {detailLeague.teamIds.length ? (
                  detailLeague.teamIds.map((teamId) => (
                    <span key={teamId} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {teamById.get(teamId)?.name ?? `Equipo #${teamId}`}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500">Sin equipos asignados.</span>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => setDetailLeague(null)}>
            Cerrar
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteLeague !== null}
        title="Eliminar liga"
        message={
          deleteLeague
            ? `Seguro que deseas eliminar la liga ${deleteLeague.name}. Esta accion no se puede deshacer.`
            : "Seguro que deseas eliminar esta liga. Esta accion no se puede deshacer."
        }
        onCancel={() => setDeleteLeague(null)}
        onConfirm={removeLeague}
      />
    </div>
  );
}
