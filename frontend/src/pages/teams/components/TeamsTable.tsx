import { ChevronLeft, ChevronRight } from "lucide-react";

import type { SortDir, SortKey, TeamListItem } from "@/pages/teams/Teams.types";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { cn } from "@/shared/utils/cn";

type TeamsTableProps = {
  teams: TeamListItem[];
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  deletingTeamId: number | null;
  onToggleSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (team: TeamListItem) => void;
  onEdit: (team: TeamListItem) => void;
  onManage: (team: TeamListItem) => void;
  onDelete: (team: TeamListItem) => void;
};

const rosterClass: Record<"Con jugadores" | "Sin jugadores", string> = {
  "Con jugadores": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Sin jugadores": "border-slate-200 bg-slate-100 text-slate-600",
};

const logoPalette = [
  "border-orange-200 bg-orange-50 text-orange-700",
  "border-sky-200 bg-sky-50 text-sky-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-violet-200 bg-violet-50 text-violet-700",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function TeamsTable({
  teams,
  loading,
  sortKey,
  sortDir,
  currentPage,
  totalPages,
  pageSize,
  deletingTeamId,
  onToggleSort,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onManage,
  onDelete,
}: TeamsTableProps) {
  const emptyRowsCount = Math.max(0, pageSize - teams.length);
  const canGoBack = currentPage > 1;
  const canGoForward = currentPage < totalPages;

  return (
    <TableShell className="min-h-[460px]">
      <table className="w-full min-w-[860px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "110px" }} />
          <col style={{ width: "90px" }} />
          <col style={{ width: "260px" }} />
          <col style={{ width: "280px" }} />
          <col style={{ width: "230px" }} />
        </colgroup>
        <thead>
          <tr className={tableHeaderClass}>
            <th className={tableCellClass}>LOGO</th>
            <th className={tableCellClass}>
              <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton label="NOMBRE" sortKey="name" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton
                label="PLANTILLA"
                sortKey="players"
                activeKey={sortKey}
                direction={sortDir}
                onToggle={onToggleSort}
              />
            </th>
            <th className={`${tableCellClass} text-right`}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                Cargando equipos...
              </td>
            </tr>
          ) : null}

          {!loading &&
            teams.map((team) => (
              <tr key={team.id} className={tableRowClass}>
                <td className={tableCellClass}>
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl border text-xs font-bold shadow-sm",
                      logoPalette[team.id % logoPalette.length]
                    )}
                  >
                    {getInitials(team.name)}
                  </div>
                </td>
                <td className={`${tableCellClass} font-semibold text-slate-800`}>{team.id}</td>
                <td className={tableCellClass}>
                  <div className="space-y-1">
                    <p className="truncate font-medium text-slate-900" title={team.name}>
                      {team.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {team.playerCount} {team.playerCount === 1 ? "jugador asignado" : "jugadores asignados"}
                    </p>
                  </div>
                </td>
                <td className={tableCellClass}>
                  <div className="space-y-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                        rosterClass[team.rosterStatus]
                      )}
                    >
                      {team.rosterStatus}
                    </span>
                    <p className="truncate text-sm text-slate-700" title={team.playersLabel}>
                      {team.players.length > 0 ? team.playersLabel : "Sin jugadores asignados"}
                    </p>
                  </div>
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <RowActions<TeamListItem>
                    row={team}
                    onView={onView}
                    onEdit={onEdit}
                    onManage={onManage}
                    manageLabel="Ver jugadores"
                    onSecurity={onView}
                    securityLabel="Ver equipo"
                    onDelete={onDelete}
                    disabled={deletingTeamId === team.id}
                  />
                </td>
              </tr>
            ))}

          {!loading && teams.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-center" colSpan={5}>
                <TableEmptyState
                  mode="empty"
                  title="No hay equipos registrados"
                  description="Comienza creando tu primer equipo para que aparezca en este listado."
                />
              </td>
            </tr>
          ) : null}

          {!loading && teams.length > 0
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

      {!loading ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs font-medium text-slate-500">
            Pagina {currentPage} de {totalPages}
          </p>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!canGoBack}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Pagina anterior"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="inline-flex min-w-[36px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {currentPage}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!canGoForward}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Pagina siguiente"
            >
              <ChevronRight size={14} />
            </button>

            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 focus:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-100"
              aria-label="Filas por pagina"
            >
              <option value={6}>6</option>
              <option value={8}>8</option>
              <option value={10}>10</option>
            </select>
          </div>
        </div>
      ) : null}
    </TableShell>
  );
}
