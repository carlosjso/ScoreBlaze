import { ArrowDownUp, Bolt, ChevronDown, ChevronUp, Pencil, Search, Shirt, Trash2, UsersRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { TeamLogo } from "@/features/teams/components/TeamLogo";
import type { SortDir, SortKey, TeamListItem } from "@/features/teams/Teams.types";
import { Paginator } from "@/shared/components/table/Paginator";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { IconButton } from "@/shared/components/ui";
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
  onView: (team: TeamListItem) => void;
  onEdit: (team: TeamListItem) => void;
  onManage: (team: TeamListItem) => void;
  onDelete: (team: TeamListItem) => void;
};

const rosterClass: Record<"Con jugadores" | "Sin jugadores", string> = {
  "Con jugadores": "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Sin jugadores": "border-slate-200 bg-slate-100 text-slate-600",
};

const sortLabels: Record<SortKey, string> = {
  id: "ID",
  name: "Nombre",
  players: "Plantilla",
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
    <article className="relative aspect-[11/10] rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="h-4 w-10 animate-pulse rounded-full bg-slate-200/80" />

          <div className="flex gap-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-8 w-8 animate-pulse rounded-lg bg-slate-200/80" />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200/80" />
          <div className="mt-3 h-5 w-28 animate-pulse rounded-full bg-slate-200/80" />
          <div className="mt-2 h-px w-8 bg-slate-200/80" />
          <div className="mt-3 h-6 w-24 animate-pulse rounded-full bg-slate-200/80" />
        </div>
      </div>
    </article>
  );
}

function TeamCardActions({
  team,
  deletingTeamId,
  onView,
  onEdit,
  onManage,
  onDelete,
}: Pick<TeamsTableProps, "deletingTeamId" | "onView" | "onEdit" | "onManage" | "onDelete"> & {
  team: TeamListItem;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const disabled = deletingTeamId === team.id;

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
        label="Ver plantilla"
        onClick={() => onManage(team)}
        disabled={disabled}
        className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
      >
        <Shirt size={14} />
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
              onClick={() => runAction(() => onView(team))}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search size={14} />
              Ver datos
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => runAction(() => onEdit(team))}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Pencil size={14} />
              Editar
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => runAction(() => onDelete(team))}
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

function TeamCard({
  team,
  deletingTeamId,
  onView,
  onEdit,
  onManage,
  onDelete,
}: Pick<TeamsTableProps, "deletingTeamId" | "onView" | "onEdit" | "onManage" | "onDelete"> & {
  team: TeamListItem;
}) {
  const rosterSummary =
    team.playerCount === 0
      ? "Sin jugadores"
      : `${team.playerCount} ${team.playerCount === 1 ? "jugador" : "jugadores"}`;

  return (
    <article className="group relative aspect-[11/10] rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_16px_36px_rgba(249,115,22,0.12)] focus-within:border-orange-200 focus-within:shadow-[0_16px_36px_rgba(249,115,22,0.12)]">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between">
          <p className="text-xs font-semibold text-slate-500">#{team.id}</p>
          <TeamCardActions
            team={team}
            deletingTeamId={deletingTeamId}
            onView={onView}
            onEdit={onEdit}
            onManage={onManage}
            onDelete={onDelete}
          />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="rounded-full bg-[radial-gradient(circle_at_top,#fff7ed_0%,#ffffff_74%)] p-1.5 shadow-[0_14px_26px_rgba(249,115,22,0.14)] ring-1 ring-orange-100">
            <TeamLogo
              name={team.name}
              logoBase64={team.logoBase64}
              seed={team.id}
              className="h-20 w-20 rounded-full bg-white text-2xl shadow-sm xl:h-24 xl:w-24"
              imageClassName="p-2"
            />
          </div>

          <h3 className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-bold text-slate-950 sm:text-base" title={team.name}>
            {team.name}
          </h3>

          <div className="mt-2 h-px w-8 bg-slate-200" />

          <span
            className={cn(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              rosterClass[team.rosterStatus],
            )}
          >
            {team.playerCount > 0 ? <UsersRound size={12} /> : <Shirt size={12} />}
            {rosterSummary}
          </span>
        </div>
      </div>
    </article>
  );
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
  onView,
  onEdit,
  onManage,
  onDelete,
}: TeamsTableProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Vista de equipos</p>
            <p className="mt-1 text-sm text-slate-600">Explora el listado en formato card y ordenalo por el dato que te interese.</p>
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
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: pageSize }).map((_, index) => (
            <SkeletonCard key={`team-card-skeleton-${index}`} />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-[24px] border border-slate-300 bg-white px-4 py-6 shadow-sm">
          <TableEmptyState
            mode="empty"
            title="No hay equipos registrados"
            description="Comienza creando tu primer equipo para que aparezca en esta vista."
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              deletingTeamId={deletingTeamId}
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
