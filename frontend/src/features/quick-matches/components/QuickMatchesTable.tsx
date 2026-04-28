import type { QuickMatchListItem, SortDir, SortKey } from "@/features/quick-matches/QuickMatches.types";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { cn } from "@/shared/utils/cn";

type QuickMatchesTableProps = {
  matches: QuickMatchListItem[];
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  hasActiveFilters: boolean;
  deletingMatchId: number | null;
  onToggleSort: (key: SortKey) => void;
  onClearFilters: () => void;
  onView: (match: QuickMatchListItem) => void;
  onEdit: (match: QuickMatchListItem) => void;
  onDelete: (match: QuickMatchListItem) => void;
};

const statusClass = {
  scheduled: "bg-sky-100 text-sky-700",
  live: "bg-amber-100 text-amber-700",
  finished: "bg-emerald-100 text-emerald-700",
} as const;

export function QuickMatchesTable({
  matches,
  loading,
  sortKey,
  sortDir,
  hasActiveFilters,
  deletingMatchId,
  onToggleSort,
  onClearFilters,
  onView,
  onEdit,
  onDelete,
}: QuickMatchesTableProps) {
  const minVisibleRows = 7;
  const emptyRowsCount = Math.max(0, minVisibleRows - matches.length);

  return (
    <TableShell className="min-h-[420px]">
      <table className="w-full min-w-[980px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "90px" }} />
          <col style={{ width: "360px" }} />
          <col style={{ width: "230px" }} />
          <col style={{ width: "150px" }} />
          <col style={{ width: "130px" }} />
        </colgroup>
        <thead>
          <tr className={tableHeaderClass}>
            <th className={tableCellClass}>
              <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>PARTIDO</th>
            <th className={tableCellClass}>
              <SortHeaderButton
                label="FECHA"
                sortKey="matchDate"
                activeKey={sortKey}
                direction={sortDir}
                onToggle={onToggleSort}
              />
            </th>
            <th className={tableCellClass}>ESTATUS</th>
            <th className={`${tableCellClass} text-right`}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={5}>
                Cargando partidos...
              </td>
            </tr>
          ) : null}

          {!loading &&
            matches.map((match) => (
              <tr key={match.id} className={tableRowClass}>
                <td className={tableCellClass}>{match.id}</td>
                <td className={tableCellClass}>
                  <p className="truncate font-medium text-slate-900" title={match.matchupLabel}>
                    {match.matchupLabel}
                  </p>
                  <p className="truncate text-xs text-slate-500" title={`${match.scoreLabel} · ${match.venueLabel}`}>
                    {match.scoreLabel !== "Sin marcador" ? `${match.scoreLabel} · ` : ""}
                    {match.venueLabel}
                  </p>
                </td>
                <td className={tableCellClass}>
                  <p>{match.dateLabel}</p>
                  <p className="text-xs text-slate-500">{match.timeLabel}</p>
                </td>
                <td className={tableCellClass}>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusClass[match.status])}>
                    {match.statusLabel}
                  </span>
                  <p className="mt-1 truncate text-xs text-slate-500" title={match.resultLabel}>
                    {match.resultLabel}
                  </p>
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <RowActions<QuickMatchListItem>
                    row={match}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    disabled={deletingMatchId === match.id}
                  />
                </td>
              </tr>
            ))}

          {!loading && matches.length === 0 ? (
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
                  onAction={hasActiveFilters ? onClearFilters : undefined}
                />
              </td>
            </tr>
          ) : null}

          {!loading && matches.length > 0
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
  );
}

