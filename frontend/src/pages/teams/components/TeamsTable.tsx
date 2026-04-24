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
  hasActiveFilters: boolean;
  deletingTeamId: number | null;
  onToggleSort: (key: SortKey) => void;
  onClearFilters: () => void;
  onView: (team: TeamListItem) => void;
  onEdit: (team: TeamListItem) => void;
  onManage: (team: TeamListItem) => void;
  onDelete: (team: TeamListItem) => void;
};

const rosterClass: Record<"Con jugadores" | "Sin jugadores", string> = {
  "Con jugadores": "bg-emerald-100 text-emerald-700",
  "Sin jugadores": "bg-slate-200 text-slate-700",
};

export function TeamsTable({
  teams,
  loading,
  sortKey,
  sortDir,
  hasActiveFilters,
  deletingTeamId,
  onToggleSort,
  onClearFilters,
  onView,
  onEdit,
  onManage,
  onDelete,
}: TeamsTableProps) {
  const minVisibleRows = 8;
  const emptyRowsCount = Math.max(0, minVisibleRows - teams.length);

  return (
    <TableShell className="min-h-[500px]">
      <table className="w-full min-w-[940px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "290px" }} />
          <col style={{ width: "150px" }} />
          <col style={{ width: "300px" }} />
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
                  onToggle={onToggleSort}
                />
                <SortHeaderButton
                  label="ID"
                  sortKey="id"
                  activeKey={sortKey}
                  direction={sortDir}
                  onToggle={onToggleSort}
                />
              </div>
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
            <th className={tableCellClass}>JUGADORES</th>
            <th className={`${tableCellClass} text-right`}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={4}>
                Cargando equipos...
              </td>
            </tr>
          ) : null}

          {!loading &&
            teams.map((team) => (
              <tr key={team.id} className={tableRowClass}>
                <td className={tableCellClass}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-bold text-slate-700">
                      {team.name
                        .split(" ")
                        .map((part) => part[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-semibold text-slate-900">{team.name}</p>
                      <p className="text-xs text-slate-500">ID #{team.id}</p>
                    </div>
                  </div>
                </td>
                <td className={tableCellClass}>
                  <div className="space-y-1">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {team.playerCount} {team.playerCount === 1 ? "jugador" : "jugadores"}
                    </span>
                    <div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", rosterClass[team.rosterStatus])}>
                        {team.rosterStatus}
                      </span>
                    </div>
                  </div>
                </td>
                <td className={tableCellClass}>
                  {team.players.length > 0 ? (
                    <div className="space-y-1">
                      <p className="truncate text-sm text-slate-700" title={team.playersLabel}>
                        {team.playersLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {team.players.slice(0, 2).map((player) => player.email).join(" · ")}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Sin jugadores asignados</span>
                  )}
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <RowActions<TeamListItem>
                    row={team}
                    onView={onView}
                    onEdit={onEdit}
                    onManage={onManage}
                    manageLabel="Ver jugadores"
                    onDelete={onDelete}
                    disabled={deletingTeamId === team.id}
                  />
                </td>
              </tr>
            ))}

          {!loading && teams.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-center" colSpan={4}>
                <TableEmptyState
                  mode={hasActiveFilters ? "filtered" : "empty"}
                  title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay equipos registrados"}
                  description={
                    hasActiveFilters
                      ? "Prueba con otra busqueda o limpia filtros para volver a ver la lista completa."
                      : "Comienza creando tu primer equipo y asignale jugadores desde el formulario."
                  }
                  actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
                  onAction={hasActiveFilters ? onClearFilters : undefined}
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
                </tr>
              ))
            : null}
        </tbody>
      </table>
    </TableShell>
  );
}
