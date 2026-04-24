import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { mockQuickMatches } from "@/pages/quick-matches/data/mockQuickMatches";
import type { QuickMatch, QuickMatchStatus } from "@/pages/quick-matches/types/quickMatch";
import { mockTeams } from "@/pages/teams/data/mockTeams";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { Button, Input, Modal, PageHeader, Panel, SearchInput, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type SortKey = "id" | "scheduledAt";
type SortDir = "asc" | "desc";

type QuickMatchForm = Omit<QuickMatch, "id">;

const emptyForm: QuickMatchForm = {
  homeTeamId: mockTeams[0]?.id ?? 1,
  awayTeamId: mockTeams[1]?.id ?? 1,
  scheduledAt: "",
  status: "Programado",
  notes: "",
};

const statusClass: Record<QuickMatchStatus, string> = {
  Programado: "bg-sky-100 text-sky-700",
  "En juego": "bg-amber-100 text-amber-700",
  Finalizado: "bg-emerald-100 text-emerald-700",
  Suspendido: "bg-rose-100 text-rose-700",
};

function formatScheduledAt(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function QuickMatchesPage() {
  const [matches, setMatches] = useState<QuickMatch[]>(mockQuickMatches);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [detailMatch, setDetailMatch] = useState<QuickMatch | null>(null);
  const [deleteMatch, setDeleteMatch] = useState<QuickMatch | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingMatch, setEditingMatch] = useState<QuickMatch | null>(null);
  const [form, setForm] = useState<QuickMatchForm>(emptyForm);

  const teamNameById = useMemo(
    () => new Map(mockTeams.map((team) => [team.id, team.name])),
    []
  );

  const filteredMatches = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    let base = [...matches];

    if (statusFilter !== "all") {
      base = base.filter((match) => match.status === statusFilter);
    }

    if (normalized) {
      base = base.filter((match) => {
        const homeName = teamNameById.get(match.homeTeamId)?.toLowerCase() ?? "";
        const awayName = teamNameById.get(match.awayTeamId)?.toLowerCase() ?? "";
        return (
          String(match.id).includes(normalized) ||
          homeName.includes(normalized) ||
          awayName.includes(normalized) ||
          match.status.toLowerCase().includes(normalized) ||
          formatScheduledAt(match.scheduledAt).toLowerCase().includes(normalized)
        );
      });
    }

    const sorted = [...base].sort((left, right) => {
      if (sortKey === "id") return left.id - right.id;
      return left.scheduledAt.localeCompare(right.scheduledAt);
    });

    return sortDir === "asc" ? sorted : sorted.reverse();
  }, [matches, search, sortDir, sortKey, statusFilter, teamNameById]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
      return;
    }
    setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const openCreate = () => {
    setFormMode("create");
    setEditingMatch(null);
    setForm({
      ...emptyForm,
      homeTeamId: mockTeams[0]?.id ?? 1,
      awayTeamId: mockTeams[1]?.id ?? mockTeams[0]?.id ?? 1,
    });
    setFormOpen(true);
  };

  const openEdit = (match: QuickMatch) => {
    setFormMode("edit");
    setEditingMatch(match);
    setForm({
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      scheduledAt: match.scheduledAt,
      status: match.status,
      notes: match.notes,
    });
    setFormOpen(true);
  };

  const canSubmitForm = form.homeTeamId !== form.awayTeamId && Boolean(form.scheduledAt);

  const submitForm = () => {
    if (!canSubmitForm) return;

    if (formMode === "create") {
      const nextId = matches.length ? Math.max(...matches.map((match) => match.id)) + 1 : 1;
      setMatches((prev) => [{ id: nextId, ...form }, ...prev]);
      setFormOpen(false);
      return;
    }

    if (!editingMatch) return;
    setMatches((prev) => prev.map((match) => (match.id === editingMatch.id ? { ...match, ...form } : match)));
    setFormOpen(false);
  };

  const removeMatch = () => {
    if (!deleteMatch) return;
    setMatches((prev) => prev.filter((match) => match.id !== deleteMatch.id));
    setDeleteMatch(null);
  };

  const minVisibleRows = 7;
  const emptyRowsCount = Math.max(0, minVisibleRows - filteredMatches.length);
  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <div className="sb-page">
      <div className="sb-page-shell">
        <PageHeader title="Partido rapido" subtitle="Programa partidos amistosos entre dos equipos." />

        <Panel>
          <div className="sb-filter-bar gap-2 sm:grid sm:grid-cols-[minmax(280px,1.8fr)_minmax(180px,0.8fr)_auto] sm:items-center">
            <div className="w-full min-w-0">
              <SearchInput value={search} onChange={setSearch} placeholder="Buscar por equipo, estatus o fecha" />
            </div>

            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full">
              <option value="all">Estatus: Todos</option>
              <option value="Programado">Programado</option>
              <option value="En juego">En juego</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Suspendido">Suspendido</option>
            </Select>

            <div className="sm:justify-self-end">
              <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
                Crear partido
              </Button>
            </div>
          </div>

          <TableShell className="min-h-[420px]">
            <table className="w-full min-w-[980px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "90px" }} />
                <col style={{ width: "360px" }} />
                <col style={{ width: "230px" }} />
                <col style={{ width: "150px" }} />
                <col style={{ width: "150px" }} />
              </colgroup>
              <thead>
                <tr className={tableHeaderClass}>
                  <th className={tableCellClass}>
                    <SortHeaderButton
                      label="ID"
                      sortKey="id"
                      activeKey={sortKey}
                      direction={sortDir}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className={tableCellClass}>PARTIDO</th>
                  <th className={tableCellClass}>
                    <SortHeaderButton
                      label="FECHA"
                      sortKey="scheduledAt"
                      activeKey={sortKey}
                      direction={sortDir}
                      onToggle={toggleSort}
                    />
                  </th>
                  <th className={tableCellClass}>ESTATUS</th>
                  <th className={`${tableCellClass} text-right`}>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((match) => (
                  <tr key={match.id} className={tableRowClass}>
                    <td className={tableCellClass}>{match.id}</td>
                    <td className={tableCellClass}>
                      <p className="truncate font-medium text-slate-900">
                        {teamNameById.get(match.homeTeamId)} vs {teamNameById.get(match.awayTeamId)}
                      </p>
                      <p className="truncate text-xs text-slate-500">{match.notes || "Sin notas"}</p>
                    </td>
                    <td className={tableCellClass}>{formatScheduledAt(match.scheduledAt)}</td>
                    <td className={tableCellClass}>
                      <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", statusClass[match.status])}>
                        {match.status}
                      </span>
                    </td>
                    <td className={`${tableCellClass} text-right`}>
                      <RowActions<QuickMatch>
                        row={match}
                        onView={(row) => setDetailMatch(row)}
                        onEdit={openEdit}
                        onDelete={(row) => setDeleteMatch(row)}
                      />
                    </td>
                  </tr>
                ))}

                {filteredMatches.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-center" colSpan={5}>
                      <TableEmptyState
                        mode={hasActiveFilters ? "filtered" : "empty"}
                        title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay partidos rapidos registrados"}
                        description={
                          hasActiveFilters
                            ? "Prueba ajustando la busqueda o el estatus para localizar partidos."
                            : "Registra tu primer partido rapido para iniciar la agenda del torneo."
                        }
                        actionLabel={hasActiveFilters ? "Limpiar filtros" : "Crear partido"}
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

                {filteredMatches.length > 0
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

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === "create" ? "Crear partido rapido" : "Editar partido rapido"}
        maxWidthClassName="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Equipo local"
            value={String(form.homeTeamId)}
            onChange={(event) => setForm((prev) => ({ ...prev, homeTeamId: Number(event.target.value) }))}
          >
            {mockTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <Select
            label="Equipo visitante"
            value={String(form.awayTeamId)}
            onChange={(event) => setForm((prev) => ({ ...prev, awayTeamId: Number(event.target.value) }))}
          >
            {mockTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </Select>
          <Input
            label="Fecha y hora"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(event) => setForm((prev) => ({ ...prev, scheduledAt: event.target.value }))}
          />
          <Select
            label="Estatus"
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as QuickMatchStatus }))}
          >
            <option value="Programado">Programado</option>
            <option value="En juego">En juego</option>
            <option value="Finalizado">Finalizado</option>
            <option value="Suspendido">Suspendido</option>
          </Select>
          <Input
            label="Notas"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Detalles opcionales del partido"
            containerClassName="sm:col-span-2"
          />
          {form.homeTeamId === form.awayTeamId ? (
            <p className="sm:col-span-2 text-xs font-semibold text-rose-600">
              El equipo local y visitante no pueden ser el mismo.
            </p>
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
        isOpen={detailMatch !== null}
        onClose={() => setDetailMatch(null)}
        title="Detalle de partido rapido"
        maxWidthClassName="max-w-lg"
      >
        {detailMatch ? (
          <div className="grid grid-cols-1 gap-3">
            <Input
              label="Partido"
              value={`${teamNameById.get(detailMatch.homeTeamId)} vs ${teamNameById.get(detailMatch.awayTeamId)}`}
              disabled
            />
            <Input label="Fecha y hora" value={formatScheduledAt(detailMatch.scheduledAt)} disabled />
            <Input label="Estatus" value={detailMatch.status} disabled />
            <Input label="Notas" value={detailMatch.notes || "Sin notas"} disabled />
          </div>
        ) : null}
        <div className="mt-5 flex justify-end">
          <Button variant="secondary" onClick={() => setDetailMatch(null)}>
            Cerrar
          </Button>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteMatch !== null}
        title="Eliminar partido rapido"
        message={
          deleteMatch
            ? `Seguro que deseas eliminar el partido ${teamNameById.get(deleteMatch.homeTeamId)} vs ${teamNameById.get(deleteMatch.awayTeamId)}. Esta accion no se puede deshacer.`
            : "Seguro que deseas eliminar este partido. Esta accion no se puede deshacer."
        }
        onCancel={() => setDeleteMatch(null)}
        onConfirm={removeMatch}
      />
    </div>
  );
}
