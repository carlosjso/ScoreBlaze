import type { LeagueListItem, SortDir, SortKey } from "@/features/leagues/Leagues.types";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { RowActions } from "@/shared/components/table/RowActions";
import { Paginator } from "@/shared/components/table/Paginator";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";

type LeaguesTableProps = {
  leagues: LeagueListItem[];
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasActiveFilters: boolean;
  deletingLeagueId: number | null;
  onToggleSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onView: (league: LeagueListItem) => void;
  onEdit: (league: LeagueListItem) => void;
  onManage: (league: LeagueListItem) => void;
  onDelete: (league: LeagueListItem) => void;
};

function SkeletonCell({ className }: { className: string }) {
  return <div className={`h-4 animate-pulse rounded-full bg-slate-200/80 ${className}`} />;
}

export function LeaguesTable({
  leagues,
  loading,
  sortKey,
  sortDir,
  currentPage,
  totalPages,
  pageSize,
  hasActiveFilters,
  deletingLeagueId,
  onToggleSort,
  onPageChange,
  onClearFilters,
  onView,
  onEdit,
  onManage,
  onDelete,
}: LeaguesTableProps) {
  const emptyRowsCount = Math.max(0, pageSize - leagues.length);

  return (
    <TableShell className="min-h-[460px]">
      <table className="w-full min-w-[1030px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "80px" }} />
          <col style={{ width: "280px" }} />
          <col style={{ width: "220px" }} />
          <col style={{ width: "150px" }} />
          <col style={{ width: "140px" }} />
          <col style={{ width: "160px" }} />
        </colgroup>
        <thead>
          <tr className={tableHeaderClass}>
            <th className={tableCellClass}>
              <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton label="NOMBRE" sortKey="name" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>CATEGORIA</th>
            <th className={tableCellClass}>
              <SortHeaderButton
                label="EQUIPOS"
                sortKey="teams"
                activeKey={sortKey}
                direction={sortDir}
                onToggle={onToggleSort}
              />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton
                label="ESTATUS"
                sortKey="status"
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
            Array.from({ length: pageSize }).map((_, index) => (
              <tr key={`leagues-skeleton-${index}`} className={tableRowClass}>
                <td className={tableCellClass}>
                  <SkeletonCell className="w-10" />
                </td>
                <td className={tableCellClass}>
                  <div className="space-y-2">
                    <SkeletonCell className="w-36" />
                    <SkeletonCell className="w-28" />
                  </div>
                </td>
                <td className={tableCellClass}>
                  <SkeletonCell className="w-28" />
                </td>
                <td className={tableCellClass}>
                  <SkeletonCell className="h-6 w-20 rounded-full" />
                </td>
                <td className={tableCellClass}>
                  <SkeletonCell className="h-6 w-24 rounded-full" />
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <div className="flex justify-end gap-2">
                    {Array.from({ length: 4 }).map((__, actionIndex) => (
                      <div
                        key={`leagues-skeleton-action-${index}-${actionIndex}`}
                        className="h-9 w-9 animate-pulse rounded-lg bg-slate-200/80"
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))
          ) : null}

          {!loading &&
            leagues.map((league) => (
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
                    {league.teamCount} {league.teamCount === 1 ? "equipo" : "equipos"}
                  </span>
                </td>
                <td className={tableCellClass}>
                  <StatusBadge status={league.status} />
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <RowActions<LeagueListItem>
                    row={league}
                    onView={onView}
                    onEdit={onEdit}
                    onManage={onManage}
                    manageLabel="Ver equipos"
                    onDelete={onDelete}
                    disabled={deletingLeagueId === league.id}
                  />
                </td>
              </tr>
            ))}

          {!loading && leagues.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-center" colSpan={6}>
                <TableEmptyState
                  mode={hasActiveFilters ? "filtered" : "empty"}
                  title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay ligas registradas"}
                  description={
                    hasActiveFilters
                      ? "Prueba otra busqueda o limpia filtros para volver a ver todas las ligas."
                      : "Crea tu primera liga para configurar fechas, categoria y equipos."
                  }
                  actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
                  onAction={hasActiveFilters ? onClearFilters : undefined}
                />
              </td>
            </tr>
          ) : null}

          {!loading && leagues.length > 0
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

      {!loading ? (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs font-medium text-slate-500">
            Pagina {currentPage} de {totalPages}
          </p>

          <Paginator currentPage={currentPage} totalPages={totalPages} onChange={onPageChange} />
        </div>
      ) : null}
    </TableShell>
  );
}
