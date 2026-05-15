import {
  ArrowDownUp,
  Bolt,
  ChevronDown,
  ChevronUp,
  Pencil,
  Search,
  Tag,
  Trash2,
  UsersRound,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { LeagueListItem, LeagueStatus, SortDir, SortKey } from "@/features/leagues/Leagues.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { Paginator } from "@/shared/components/table/Paginator";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { IconButton } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

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
  onOpen: (league: LeagueListItem) => void;
  onView: (league: LeagueListItem) => void;
  onEdit: (league: LeagueListItem) => void;
  onManage: (league: LeagueListItem) => void;
  onDelete: (league: LeagueListItem) => void;
};

const sortLabels: Record<SortKey, string> = {
  id: "ID",
  name: "Nombre",
  teams: "Equipos",
  status: "Estatus",
};

const statusClass: Record<LeagueStatus, string> = {
  "En curso": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Sin empezar": "border-amber-200 bg-amber-50 text-amber-700",
  Finalizada: "border-slate-200 bg-slate-100 text-slate-600",
};

function SortPill({
  label,
  active,
  direction,
  onClick,
}: {
  label: string;
  active: boolean;
  direction: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition",
        active
          ? "border-orange-200 bg-orange-50 text-orange-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700",
      )}
    >
      {label}
      {active ? (direction === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowDownUp size={14} />}
    </button>
  );
}

function SkeletonCard() {
  return (
    <article className="relative min-h-[320px] overflow-hidden rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] p-4 shadow-sm">
      <div className="absolute left-1/2 top-12 h-24 w-24 -translate-x-1/2 rounded-full bg-orange-100/60 blur-2xl" />

      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200/80" />

          <div className="flex gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-8 w-8 animate-pulse rounded-lg bg-slate-200/80" />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200/80" />
          <div className="mt-4 h-5 w-32 animate-pulse rounded-full bg-slate-200/80" />
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-3">
          <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200/80" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200/80" />
        </div>
      </div>
    </article>
  );
}

function LeagueCardActions({
  league,
  deletingLeagueId,
  onView,
  onEdit,
  onManage,
  onDelete,
}: Pick<LeaguesTableProps, "deletingLeagueId" | "onView" | "onEdit" | "onManage" | "onDelete"> & {
  league: LeagueListItem;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const disabled = deletingLeagueId === league.id;

  useEffect(() => {
    if (!actionsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [actionsOpen]);

  const runAction = (action: () => void) => {
    action();
    setActionsOpen(false);
  };

  return (
    <div
      ref={menuRef}
      className={cn(
        "absolute right-3 top-3 z-10 flex items-center gap-2 transition duration-200",
        actionsOpen
          ? "translate-y-0 opacity-100"
          : "opacity-100 md:pointer-events-none md:translate-y-1 md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:pointer-events-auto md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100",
      )}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <IconButton
        label="Ver equipos"
        onClick={() => onManage(league)}
        disabled={disabled}
        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
      >
        <UsersRound size={14} />
      </IconButton>

      <div className="relative">
        <IconButton
          label={actionsOpen ? "Cerrar acciones" : "Abrir acciones"}
          onClick={() => setActionsOpen((current) => !current)}
          disabled={disabled}
          className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
        >
          <Bolt size={16} className={cn("transition-transform duration-200", actionsOpen && "rotate-90")} />
        </IconButton>

        {actionsOpen ? (
          <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
            <button
              type="button"
              disabled={disabled}
              onClick={() => runAction(() => onView(league))}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={14} />
              Ver datos
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => runAction(() => onEdit(league))}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={14} />
              Editar
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => runAction(() => onDelete(league))}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={14} />
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LeagueCard({
  league,
  deletingLeagueId,
  onOpen,
  onView,
  onEdit,
  onManage,
  onDelete,
}: Pick<LeaguesTableProps, "deletingLeagueId" | "onOpen" | "onView" | "onEdit" | "onManage" | "onDelete"> & {
  league: LeagueListItem;
}) {
  const teamCountLabel = `${league.teamCount} ${league.teamCount === 1 ? "equipo" : "equipos"}`;
  const leagueTypeLabel = league.category || "Sin tipo";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(league)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(league);
        }
      }}
      className="group relative isolate min-h-[320px] cursor-pointer overflow-hidden rounded-[22px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fffdfa_100%)] p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(249,115,22,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-within:border-orange-200 focus-within:shadow-[0_16px_36px_rgba(249,115,22,0.12)]"
    >
      <div className="pointer-events-none absolute inset-x-8 top-10 h-24 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,0.18)_0%,rgba(255,255,255,0)_72%)] blur-2xl transition duration-300 group-hover:scale-110" />
      <div className="pointer-events-none absolute -right-6 top-12 h-16 w-16 rounded-full bg-orange-100/40 blur-3xl" />

      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-24">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 shadow-sm">
              Liga #{league.id}
            </span>
          </div>

          <LeagueCardActions
            league={league}
            deletingLeagueId={deletingLeagueId}
            onView={onView}
            onEdit={onEdit}
            onManage={onManage}
            onDelete={onDelete}
          />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
          <div className="rounded-full bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_78%)] p-2 shadow-[0_16px_30px_rgba(249,115,22,0.16)] ring-1 ring-orange-100 transition duration-300 group-hover:scale-[1.04]">
            <TeamLogo
              name={league.name}
              logoBase64={league.logoBase64}
              seed={league.id}
              className="h-20 w-20 rounded-full bg-white text-2xl shadow-sm xl:h-24 xl:w-24"
              imageClassName="p-2.5"
            />
          </div>

          <h3 className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-bold text-slate-950 sm:text-base" title={league.name}>
            {league.name}
          </h3>
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2 border-t border-slate-100 pt-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
              statusClass[league.status],
            )}
            title={league.status}
          >
            {league.status}
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700"
            title={`Total de equipos: ${teamCountLabel}`}
          >
            <UsersRound size={12} />
            {teamCountLabel}
          </span>

          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700"
            title={`Tipo de liga: ${leagueTypeLabel}`}
          >
            <Tag size={12} />
            {leagueTypeLabel}
          </span>
        </div>
      </div>
    </article>
  );
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
  onOpen,
  onView,
  onEdit,
  onManage,
  onDelete,
}: LeaguesTableProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Vista de ligas</p>
            <p className="mt-1 text-sm text-slate-600">Explora las ligas en formato card y ordenalas por nombre, equipos o estatus.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(sortLabels) as SortKey[]).map((key) => (
              <SortPill
                key={key}
                label={sortLabels[key]}
                active={sortKey === key}
                direction={sortDir}
                onClick={() => onToggleSort(key)}
              />
            ))}
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: pageSize }).map((_, index) => (
            <SkeletonCard key={`league-card-skeleton-${index}`} />
          ))}
        </div>
      ) : leagues.length === 0 ? (
        <div className="rounded-[24px] border border-slate-300 bg-white px-4 py-6 shadow-sm">
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
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {leagues.map((league) => (
            <LeagueCard
              key={league.id}
              league={league}
              deletingLeagueId={deletingLeagueId}
              onOpen={onOpen}
              onView={onView}
              onEdit={onEdit}
              onManage={onManage}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      {!loading ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <p className="m-0 text-xs font-medium text-slate-500">
            Pagina {currentPage} de {totalPages}
          </p>

          <Paginator currentPage={currentPage} totalPages={totalPages} onChange={onPageChange} />
        </div>
      ) : null}
    </div>
  );
}
