import { Shield } from "lucide-react";

import type { SortDir, SortKey, PlayerListItem } from "@/features/players/Players.types";
import { RowActions } from "@/shared/components/table/RowActions";
import { SortHeaderButton } from "@/shared/components/table/SortHeaderButton";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { TableShell } from "@/shared/components/table/TableShell";
import { tableCellClass, tableHeaderClass, tableRowClass } from "@/shared/components/table/tableStyles";
import { cn } from "@/shared/utils/cn";

type PlayersTableProps = {
  players: PlayerListItem[];
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  hasActiveFilters: boolean;
  deletingPlayerId: number | null;
  onToggleSort: (key: SortKey) => void;
  onClearFilters: () => void;
  onView: (player: PlayerListItem) => void;
  onEdit: (player: PlayerListItem) => void;
  onManage: (player: PlayerListItem) => void;
  onDelete: (player: PlayerListItem) => void;
};

const statusClass: Record<"Con equipo" | "Sin equipo", string> = {
  "Con equipo": "bg-emerald-100 text-emerald-700",
  "Sin equipo": "bg-slate-200 text-slate-700",
};

export function PlayersTable({
  players,
  loading,
  sortKey,
  sortDir,
  hasActiveFilters,
  deletingPlayerId,
  onToggleSort,
  onClearFilters,
  onView,
  onEdit,
  onManage,
  onDelete,
}: PlayersTableProps) {
  const minVisibleRows = 8;
  const emptyRowsCount = Math.max(0, minVisibleRows - players.length);

  return (
    <TableShell className="min-h-[500px]">
      <table className="w-full min-w-[920px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "64px" }} />
          <col style={{ width: "180px" }} />
          <col style={{ width: "220px" }} />
          <col style={{ width: "120px" }} />
          <col style={{ width: "110px" }} />
          <col style={{ width: "210px" }} />
          <col style={{ width: "190px" }} />
        </colgroup>
        <thead>
          <tr className={tableHeaderClass}>
            <th className={tableCellClass}>
              <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton label="NOMBRE" sortKey="name" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>CORREO</th>
            <th className={tableCellClass}>TELEFONO</th>
            <th className={tableCellClass}>ESTATUS</th>
            <th className={tableCellClass}>EQUIPOS</th>
            <th className={`${tableCellClass} text-right`}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={7}>
                Cargando jugadores...
              </td>
            </tr>
          ) : null}

          {!loading &&
            players.map((player) => (
              <tr key={player.id} className={tableRowClass}>
                <td className={tableCellClass}>{player.id}</td>
                <td className={`${tableCellClass} truncate`} title={player.name}>
                  {player.name}
                </td>
                <td className={`${tableCellClass} truncate`} title={player.email}>
                  {player.email}
                </td>
                <td className={`${tableCellClass} truncate`} title={player.phone || "Sin telefono"}>
                  {player.phone || <span className="text-xs text-slate-500">Sin telefono</span>}
                </td>
                <td className={tableCellClass}>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", statusClass[player.status])}>
                    {player.status}
                  </span>
                </td>
                <td className={tableCellClass}>
                  {player.teamNames.length > 0 ? (
                    <div className="space-y-1">
                      <p className="truncate text-sm text-slate-700" title={player.teamLabel}>
                        {player.teamLabel}
                      </p>
                      <p className="text-xs text-slate-500">
                        {player.teamsCount} {player.teamsCount === 1 ? "equipo" : "equipos"}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Sin equipo</span>
                  )}
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <RowActions<PlayerListItem>
                    row={player}
                    onView={onView}
                    onEdit={onEdit}
                    onManage={onManage}
                    manageLabel="Asignar equipo"
                    manageIcon={<Shield size={14} />}
                    onDelete={onDelete}
                    disabled={deletingPlayerId === player.id}
                  />
                </td>
              </tr>
            ))}

          {!loading && players.length === 0 ? (
            <tr>
              <td className="px-3 py-4 text-center" colSpan={7}>
                <TableEmptyState
                  mode={hasActiveFilters ? "filtered" : "empty"}
                  title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay jugadores registrados"}
                  description={
                    hasActiveFilters
                      ? "Prueba otra busqueda o limpia filtros para volver a ver todos los jugadores."
                      : "Crea tu primer jugador. La asignacion a equipos se hace desde la plantilla de cada equipo."
                  }
                  actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
                  onAction={hasActiveFilters ? onClearFilters : undefined}
                />
              </td>
            </tr>
          ) : null}

          {!loading && players.length > 0
            ? Array.from({ length: emptyRowsCount }).map((_, index) => (
                <tr key={`empty-row-${index}`} className={tableRowClass}>
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
  );
}

