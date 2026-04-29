import {
  BarChart3,
  Bolt,
  Clock3,
  MapPin,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type {
  MatchStatusFilter,
  QuickMatchListItem,
  SortDir,
  SortKey,
} from "@/features/quick-matches/QuickMatches.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { IconButton } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type QuickMatchesTableProps = {
  matches: QuickMatchListItem[];
  loading: boolean;
  sortKey: SortKey;
  sortDir: SortDir;
  statusFilter: MatchStatusFilter;
  hasActiveFilters: boolean;
  deletingMatchId: number | null;
  onToggleSort: (key: SortKey) => void;
  onClearFilters: () => void;
  onView: (match: QuickMatchListItem) => void;
  onEdit: (match: QuickMatchListItem) => void;
  onDelete: (match: QuickMatchListItem) => void;
};

const statusClass = {
  scheduled: "border-sky-200 bg-sky-50 text-sky-700",
  live: "border-amber-200 bg-amber-50 text-amber-700",
  finished: "border-emerald-200 bg-emerald-50 text-emerald-700",
} as const;

function getScheduleStamp(match: QuickMatchListItem): string {
  return `${match.matchDate}T${match.startTime}`;
}

function sortByUpcoming(matches: QuickMatchListItem[]): QuickMatchListItem[] {
  return [...matches].sort((left, right) => getScheduleStamp(left).localeCompare(getScheduleStamp(right)));
}

function sortByRecent(matches: QuickMatchListItem[]): QuickMatchListItem[] {
  return [...matches].sort((left, right) => getScheduleStamp(right).localeCompare(getScheduleStamp(left)));
}

function openMatchTab(path: string) {
  const url = new URL(path, window.location.origin);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
}

function openMatchControl(matchId: number) {
  openMatchTab(`/scoreboard/${matchId}`);
}

function openMatchLive(matchId: number) {
  openMatchTab(`/scoreboard/live/${matchId}`);
}

function openMatchBoth(matchId: number) {
  openMatchControl(matchId);
  openMatchLive(matchId);
}

function openMatchStats(matchId: number) {
  openMatchTab(`/quick-match/${matchId}/stats`);
}

function MatchCardActions({
  match,
  deletingMatchId,
  onView,
  onEdit,
  onDelete,
  onHoverChange,
  onMenuOpenChange,
}: Pick<QuickMatchesTableProps, "deletingMatchId" | "onView" | "onEdit" | "onDelete"> & {
  match: QuickMatchListItem;
  onHoverChange?: (value: boolean) => void;
  onMenuOpenChange?: (value: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const disabled = deletingMatchId === match.id;
  const statsDisabled = disabled || match.status === "scheduled";
  const statsLabel =
    match.status === "live"
      ? "Ver estadisticas en vivo"
      : match.status === "scheduled"
        ? "Estadisticas disponibles al iniciar el partido"
        : "Ver estadisticas";

  useEffect(() => {
    onMenuOpenChange?.(open);
  }, [onMenuOpenChange, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const runAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div
      ref={menuRef}
      className="relative flex items-center gap-2"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <IconButton
        label={statsLabel}
        onClick={() => openMatchStats(match.id)}
        disabled={statsDisabled}
        className="border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
      >
        <BarChart3 size={16} />
      </IconButton>

      <IconButton
        label={open ? "Cerrar acciones" : "Abrir acciones"}
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
      >
        <Bolt size={18} className={cn("transition-transform duration-200", open && "rotate-90")} />
      </IconButton>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
          <button
            type="button"
            disabled={disabled}
            onClick={() => runAction(() => onView(match))}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search size={14} />
            Ver datos
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => runAction(() => onEdit(match))}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Pencil size={14} />
            Editar
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => runAction(() => onDelete(match))}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 size={14} />
            Eliminar
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MatchCard({
  match,
  deletingMatchId,
  onView,
  onEdit,
  onDelete,
  emphasisLabel,
}: Pick<QuickMatchesTableProps, "deletingMatchId" | "onView" | "onEdit" | "onDelete"> & {
  match: QuickMatchListItem;
  emphasisLabel?: string;
}) {
  const [cardHovered, setCardHovered] = useState(false);
  const [actionsHovered, setActionsHovered] = useState(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false);
  const showQuickLaunch = cardHovered && !actionsHovered && !actionsMenuOpen;
  const centerScoreLabel = `${match.scoreTeamA ?? "--"} - ${match.scoreTeamB ?? "--"}`;

  return (
    <article
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => {
        setCardHovered(false);
        setActionsHovered(false);
        setActionsMenuOpen(false);
      }}
      className={cn(
        "relative w-[368px] shrink-0 overflow-hidden rounded-[24px] border bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition snap-start",
        emphasisLabel
          ? "border-orange-200 shadow-[0_16px_36px_rgba(249,115,22,0.16)]"
          : "border-slate-300"
      )}
    >
      <div className="pointer-events-none absolute inset-y-3 right-3 z-10 flex items-center justify-end">
        <div
          className={cn(
            "pointer-events-auto w-[148px] rounded-[22px] border border-slate-200 bg-white/95 p-2 shadow-[0_16px_28px_rgba(15,23,42,0.14)] backdrop-blur transition-all duration-300",
            showQuickLaunch ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-10 opacity-0"
          )}
        >
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Marcador
          </p>

          <button
            type="button"
            onClick={() => openMatchControl(match.id)}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <span>Control</span>
            <span className="text-xs text-slate-400">Abrir</span>
          </button>
          <button
            type="button"
            onClick={() => openMatchLive(match.id)}
            className="mt-1 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <span>Live</span>
            <span className="text-xs text-slate-400">Abrir</span>
          </button>
          <button
            type="button"
            onClick={() => openMatchBoth(match.id)}
            className="mt-1 flex w-full items-center justify-between rounded-xl bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            <span>Ambos</span>
            <span className="text-xs text-orange-500">2 tabs</span>
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {emphasisLabel ? (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-500">
              {emphasisLabel}
            </p>
          ) : null}

          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {match.dateLabel}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                statusClass[match.status]
              )}
            >
              {match.statusLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <Clock3 size={12} />
              {match.timeLabel}
            </span>
          </div>
        </div>

        <MatchCardActions
          match={match}
          deletingMatchId={deletingMatchId}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onHoverChange={setActionsHovered}
          onMenuOpenChange={setActionsMenuOpen}
        />
      </div>

      <div className="mt-5 space-y-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center text-center">
            <TeamLogo
              name={match.teamAName}
              logoBase64={match.teamALogoBase64}
              seed={match.teamAId}
              className="h-16 w-16 rounded-3xl text-xs shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
              imageClassName="p-1.5"
              emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
            />
            <p className="mt-3 font-semibold text-slate-900">{match.teamAName}</p>
          </div>

          <div className="text-center">
            <p className="text-2xl font-black uppercase tracking-tight text-slate-900">VS</p>
            <p className="mt-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold tracking-tight text-slate-700">
              {centerScoreLabel}
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <TeamLogo
              name={match.teamBName}
              logoBase64={match.teamBLogoBase64}
              seed={match.teamBId}
              className="h-16 w-16 rounded-3xl text-xs shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
              imageClassName="p-1.5"
              emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
            />
            <p className="mt-3 font-semibold text-slate-900">{match.teamBName}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3">
          <p className="text-center text-sm font-semibold text-slate-900">{match.resultLabel}</p>

          {match.venueLabel !== "Sin sede" ? (
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <MapPin size={12} />
              <span className="max-w-full truncate" title={match.venueLabel}>
                {match.venueLabel}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function MatchSection({
  eyebrow,
  title,
  matches,
  emptyLabel,
  deletingMatchId,
  onView,
  onEdit,
  onDelete,
  firstCardHeader,
}: Pick<QuickMatchesTableProps, "deletingMatchId" | "onView" | "onEdit" | "onDelete"> & {
  eyebrow: string;
  title: string;
  matches: QuickMatchListItem[];
  emptyLabel: string;
  firstCardHeader?: string;
}) {
  return (
    <section className="rounded-[30px] border border-slate-300 bg-[linear-gradient(180deg,#fcfcfd_0%,#f7f8fa_100%)] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {eyebrow}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">{title}</h3>
          </div>
          <p className="text-sm text-slate-500">
            {matches.length} {matches.length === 1 ? "partido" : "partidos"}
          </p>
        </div>

        {matches.length > 0 ? (
          <div className="mt-5 overflow-x-auto pb-3">
            <div className="flex min-w-max gap-4 pr-2">
              {matches.map((match, index) => (
                <div key={match.id} className="shrink-0">
                  <div className="mb-2 flex h-5 items-end px-1">
                    {index === 0 && firstCardHeader ? (
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orange-500">
                        {firstCardHeader}
                      </p>
                    ) : null}
                  </div>
                  <MatchCard
                    match={match}
                    deletingMatchId={deletingMatchId}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
            {emptyLabel}
          </div>
        )}
      </div>
    </section>
  );
}

export function QuickMatchesTable({
  matches,
  loading,
  sortKey,
  sortDir,
  statusFilter,
  hasActiveFilters,
  deletingMatchId,
  onToggleSort,
  onClearFilters,
  onView,
  onEdit,
  onDelete,
}: QuickMatchesTableProps) {
  const liveMatches = sortByUpcoming(matches.filter((match) => match.status === "live"));
  const scheduledMatches = sortByUpcoming(matches.filter((match) => match.status === "scheduled"));
  const finishedMatches = sortByRecent(matches.filter((match) => match.status === "finished"));

  const showLiveSection = statusFilter === "all" || statusFilter === "live";
  const showScheduledSection = statusFilter === "all" || statusFilter === "scheduled";
  const showFinishedSection = statusFilter === "all" || statusFilter === "finished";

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-300 bg-white px-6 py-14 text-center text-sm text-slate-500 shadow-sm">
        Cargando partidos...
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-300 bg-white px-4 py-6 shadow-sm">
        <TableEmptyState
          mode={hasActiveFilters ? "filtered" : "empty"}
          title={hasActiveFilters ? "Sin resultados para esos filtros" : "No hay partidos rapidos registrados"}
          description={
            hasActiveFilters
              ? "Prueba ajustando la busqueda o el estatus para localizar partidos."
              : "Registra tu primer partido rapido para iniciar la agenda de amistosos."
          }
          actionLabel={hasActiveFilters ? "Limpiar filtros" : "Crear partido"}
          onAction={hasActiveFilters ? onClearFilters : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showLiveSection ? (
        <MatchSection
          eyebrow="En juego ahora"
          title="Partidos en juego"
          matches={liveMatches}
          emptyLabel="No hay partidos en juego en este momento."
          deletingMatchId={deletingMatchId}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : null}

      {showScheduledSection ? (
        <MatchSection
          eyebrow="Agenda programada"
          title="Partidos programados"
          matches={scheduledMatches}
          emptyLabel="No hay partidos programados por ahora."
          deletingMatchId={deletingMatchId}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          firstCardHeader="Proximo partido"
        />
      ) : null}

      {showFinishedSection ? (
        <MatchSection
          eyebrow="Resultados"
          title="Partidos finalizados"
          matches={finishedMatches}
          emptyLabel="Todavia no hay partidos finalizados."
          deletingMatchId={deletingMatchId}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ) : null}
    </div>
  );
}
