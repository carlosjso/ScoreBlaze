import { Ellipsis, Pencil, Search, Shield, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import type { SortDir, SortKey, PlayerListItem } from "@/features/players/Players.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { Paginator } from "@/shared/components/table/Paginator";
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
  currentPage: number;
  totalPages: number;
  pageSize: number;
  hasActiveFilters: boolean;
  deletingPlayerId: number | null;
  onToggleSort: (key: SortKey) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  onView: (player: PlayerListItem) => void;
  onEdit: (player: PlayerListItem) => void;
  onManage: (player: PlayerListItem) => void;
  onDelete: (player: PlayerListItem) => void;
  canEdit?: boolean;
  canAssignTeam?: boolean;
  canDelete?: boolean;
};

const statusClass: Record<"Con equipo" | "Sin equipo", string> = {
  "Con equipo": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Sin equipo": "bg-rose-50 text-rose-700 ring-rose-200",
};

const sexClass = {
  Masculino: "bg-sky-50 text-sky-700 ring-sky-200",
  Femenino: "bg-rose-50 text-rose-700 ring-rose-200",
  empty: "bg-slate-50 text-slate-500 ring-slate-200",
} as const;

type PlayerActionsProps = Pick<
  PlayersTableProps,
  "onView" | "onEdit" | "onManage" | "onDelete" | "canEdit" | "canAssignTeam" | "canDelete"
> & {
  player: PlayerListItem;
  disabled: boolean;
};

function MenuAction({
  label,
  icon,
  danger = false,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium transition",
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-700 hover:bg-slate-100",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function PlayerActions({
  player,
  disabled,
  onView,
  onEdit,
  onManage,
  onDelete,
  canEdit = true,
  canAssignTeam = true,
  canDelete = true,
}: PlayerActionsProps) {
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const hasSecondaryActions = canEdit || canAssignTeam || canDelete;

  useEffect(() => {
    if (!menuPosition) return;

    const closeMenu = (event?: Event) => {
      if (event?.target instanceof Node) {
        if (triggerRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      }
      setMenuPosition(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuPosition(null);
    };

    document.addEventListener("pointerdown", closeMenu);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuPosition]);

  const toggleMenu = () => {
    if (menuPosition) {
      setMenuPosition(null);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const menuWidth = 196;
    const actionCount = Number(canEdit) + Number(canAssignTeam) + Number(canDelete);
    const menuHeight = actionCount * 40 + 16;
    const left = Math.min(window.innerWidth - menuWidth - 12, Math.max(12, rect.right - menuWidth));
    const top = window.innerHeight - rect.bottom >= menuHeight + 8
      ? rect.bottom + 6
      : Math.max(12, rect.top - menuHeight - 6);
    setMenuPosition({ left, top });
  };

  const runAction = (action: (player: PlayerListItem) => void) => {
    setMenuPosition(null);
    action(player);
  };

  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        title="Ver detalle"
        aria-label={`Ver detalle de ${player.name}`}
        disabled={disabled}
        onClick={() => onView(player)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:opacity-50"
      >
        <Search size={14} />
      </button>

      {hasSecondaryActions ? (
        <button
          ref={triggerRef}
          type="button"
          title="Mas acciones"
          aria-label={`Mas acciones para ${player.name}`}
          aria-haspopup="menu"
          aria-expanded={menuPosition !== null}
          disabled={disabled}
          onClick={toggleMenu}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-600 ring-1 ring-slate-300 transition hover:bg-orange-50 hover:text-orange-700 hover:ring-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 disabled:opacity-50"
        >
          <Ellipsis size={16} />
        </button>
      ) : null}

      {menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[10000] w-[196px] rounded-2xl bg-white p-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] ring-1 ring-slate-200"
              style={menuPosition}
            >
              {canEdit ? <MenuAction label="Editar jugador" icon={<Pencil size={15} />} onClick={() => runAction(onEdit)} /> : null}
              {canAssignTeam ? <MenuAction label="Asignar equipo" icon={<Shield size={15} />} onClick={() => runAction(onManage)} /> : null}
              {canDelete ? <MenuAction label="Eliminar" icon={<Trash2 size={15} />} danger onClick={() => runAction(onDelete)} /> : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function PlayersTable({
  players,
  loading,
  sortKey,
  sortDir,
  currentPage,
  totalPages,
  pageSize,
  hasActiveFilters,
  deletingPlayerId,
  onToggleSort,
  onPageChange,
  onClearFilters,
  onView,
  onEdit,
  onManage,
  onDelete,
  canEdit = true,
  canAssignTeam = true,
  canDelete = true,
}: PlayersTableProps) {
  const emptyRowsCount = Math.max(0, pageSize - players.length);

  return (
    <TableShell className="min-h-[500px]">
      <table className="w-full min-w-[1020px] table-fixed border-collapse">
        <colgroup>
          <col style={{ width: "58px" }} />
          <col style={{ width: "250px" }} />
          <col style={{ width: "135px" }} />
          <col style={{ width: "110px" }} />
          <col style={{ width: "120px" }} />
          <col style={{ width: "275px" }} />
          <col style={{ width: "112px" }} />
        </colgroup>
        <thead>
          <tr className={tableHeaderClass}>
            <th className={tableCellClass}>
              <SortHeaderButton label="ID" sortKey="id" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>
              <SortHeaderButton label="JUGADOR" sortKey="name" activeKey={sortKey} direction={sortDir} onToggle={onToggleSort} />
            </th>
            <th className={tableCellClass}>TELEFONO</th>
            <th className={tableCellClass}>SEXO</th>
            <th className={tableCellClass}>ESTATUS</th>
            <th className={tableCellClass}>EQUIPOS</th>
            <th className={`${tableCellClass} text-right`}>ACCIONES</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: pageSize }).map((_, index) => (
              <tr key={`players-skeleton-${index}`} className={tableRowClass}>
                <td className={tableCellClass}>
                  <div className="h-4 w-10 animate-pulse rounded-full bg-slate-200/80" />
                </td>
                <td className={tableCellClass}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200/80" />
                    <div className="space-y-2">
                      <div className="h-4 w-28 animate-pulse rounded-full bg-slate-200/80" />
                      <div className="h-3 w-36 animate-pulse rounded-full bg-slate-200/70" />
                    </div>
                  </div>
                </td>
                <td className={tableCellClass}>
                  <div className="h-4 w-24 animate-pulse rounded-full bg-slate-200/80" />
                </td>
                <td className={tableCellClass}>
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/80" />
                </td>
                <td className={tableCellClass}>
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/80" />
                </td>
                <td className={tableCellClass}>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-200/80" />
                    <div className="h-8 w-20 animate-pulse rounded-xl bg-slate-200/80" />
                  </div>
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <div className="flex justify-end gap-2">
                    {Array.from({ length: 2 }).map((__, actionIndex) => (
                      <div
                        key={`players-skeleton-action-${index}-${actionIndex}`}
                        className="h-9 w-9 animate-pulse rounded-lg bg-slate-200/80"
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))
          ) : null}

          {!loading &&
            players.map((player) => (
              <tr key={player.id} className={cn(tableRowClass, "odd:bg-white even:bg-slate-50/35")}>
                <td className={tableCellClass}>
                  <span className="text-xs font-semibold text-slate-400">#{player.id}</span>
                </td>
                <td className={tableCellClass}>
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayerPhoto
                      name={player.name}
                      photoBase64={player.photoBase64}
                      className="h-9 w-9 shrink-0 text-[10px] ring-2 ring-white"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900" title={player.name}>{player.name}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500" title={player.email}>{player.email}</p>
                    </div>
                  </div>
                </td>
                <td className={`${tableCellClass} truncate`} title={player.phone || "Sin telefono"}>
                  {player.phone || <span className="text-xs text-slate-500">Sin telefono</span>}
                </td>
                <td className={tableCellClass}>
                  <span
                    className={cn(
                      "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
                      player.sex ? sexClass[player.sex] : sexClass.empty,
                    )}
                  >
                    {player.sex || "Sin especificar"}
                  </span>
                </td>
                <td className={tableCellClass}>
                  <span className={cn("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", statusClass[player.status])}>
                    {player.status}
                  </span>
                </td>
                <td className={tableCellClass}>
                  {player.teams.length > 0 ? (
                    <div className="flex min-w-0 items-center gap-1.5" title={player.teamLabel}>
                      {player.teams.slice(0, 2).map((team) => (
                        <span key={team.id} className="inline-flex min-w-0 max-w-[105px] items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-1.5 ring-1 ring-slate-200">
                          <TeamLogo
                            name={team.name}
                            logoBase64={team.logoBase64}
                            seed={team.id}
                            className="h-5 w-5 shrink-0 rounded-md text-[7px]"
                            imageClassName="object-contain"
                          />
                          <span className="truncate text-[11px] font-semibold text-slate-700">{team.name}</span>
                        </span>
                      ))}
                      {player.teamsCount > 2 ? (
                        <span className="inline-flex h-7 shrink-0 items-center rounded-lg bg-orange-50 px-2 text-[10px] font-bold text-orange-700 ring-1 ring-orange-100">
                          +{player.teamsCount - 2}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="inline-flex rounded-xl bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500 ring-1 ring-slate-200">Sin equipo</span>
                  )}
                </td>
                <td className={`${tableCellClass} text-right`}>
                  <PlayerActions
                    player={player}
                    onView={onView}
                    onEdit={onEdit}
                    onManage={onManage}
                    onDelete={onDelete}
                    disabled={deletingPlayerId === player.id}
                    canEdit={canEdit}
                    canAssignTeam={canAssignTeam}
                    canDelete={canDelete}
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

