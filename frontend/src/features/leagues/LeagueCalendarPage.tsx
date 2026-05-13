import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Shield, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { useLeagueMatchesMutations } from "@/features/leagues/hooks/useLeagueMatchesMutations";
import { QuickMatchDetailModal } from "@/features/quick-matches/components/QuickMatchDetailModal";
import { QuickMatchFormModal } from "@/features/quick-matches/components/QuickMatchFormModal";
import { useQuickMatchesModals } from "@/features/quick-matches/hooks/useQuickMatchesModals";
import type { MatchStatus } from "@/features/quick-matches/QuickMatches.types";
import type { QuickMatchListItem } from "@/features/quick-matches/QuickMatches.types";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, Modal, PageHeader, Panel, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type CalendarViewMode = "day" | "week" | "month";

type CalendarEvent = QuickMatchListItem & {
  startsAt: Date;
  endsAt: Date;
  dayKey: string;
  durationMinutes: number;
};

type CalendarEventSlot = {
  slotId: string;
  dayKey: string;
  startsAt: Date;
  endsAt: Date;
  durationMinutes: number;
  timeLabel: string;
  status: MatchStatus;
  matches: CalendarEvent[];
  primaryMatch: CalendarEvent;
};

type PositionedCalendarSlot = CalendarEventSlot & {
  columnIndex: number;
  columnCount: number;
};

const weekdayFormatter = new Intl.DateTimeFormat("es-MX", { weekday: "short" });
const dayFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("es-MX", { dateStyle: "full" });
const monthFormatter = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" });
const hourFormatter = new Intl.DateTimeFormat("es-MX", { hour: "numeric", minute: "2-digit" });

const viewLabels: Record<CalendarViewMode, string> = {
  day: "Dia",
  week: "Semana",
  month: "Mes",
};

const eventToneClassName = {
  scheduled: "border-amber-200 bg-amber-50 text-amber-900",
  live: "border-orange-300 bg-orange-100 text-orange-950",
  finished: "border-slate-200 bg-slate-100 text-slate-700",
} as const;

function parseDateTime(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hours, minutes] = timeValue.slice(0, 5).split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  return addDays(date, -date.getDay());
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addDays(value: Date, amount: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function getDayKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getViewStart(anchorDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return startOfDay(anchorDate);
  }

  if (viewMode === "week") {
    return startOfWeek(anchorDate);
  }

  return startOfWeek(startOfMonth(anchorDate));
}

function getViewEnd(anchorDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return addDays(startOfDay(anchorDate), 1);
  }

  if (viewMode === "week") {
    return addDays(startOfWeek(anchorDate), 7);
  }

  return addDays(startOfWeek(startOfMonth(anchorDate)), 42);
}

function getVisibleDays(anchorDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return [startOfDay(anchorDate)];
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(anchorDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }

  const monthGridStart = startOfWeek(startOfMonth(anchorDate));
  return Array.from({ length: 42 }, (_, index) => addDays(monthGridStart, index));
}

function buildRangeLabel(anchorDate: Date, viewMode: CalendarViewMode) {
  if (viewMode === "day") {
    return fullDateFormatter.format(anchorDate);
  }

  if (viewMode === "week") {
    const weekStart = startOfWeek(anchorDate);
    const weekEnd = addDays(weekStart, 6);
    return `${shortDateFormatter.format(weekStart)} - ${shortDateFormatter.format(weekEnd)}`;
  }

  return monthFormatter.format(anchorDate);
}

function navigateAnchorDate(anchorDate: Date, viewMode: CalendarViewMode, step: number) {
  if (viewMode === "day") {
    return addDays(anchorDate, step);
  }

  if (viewMode === "week") {
    return addDays(anchorDate, step * 7);
  }

  return addMonths(anchorDate, step);
}

function getDefaultAnchorDate(matches: QuickMatchListItem[]) {
  const firstMatch = [...matches].sort((left, right) => {
    const leftKey = `${left.matchDate}T${left.startTime}`;
    const rightKey = `${right.matchDate}T${right.startTime}`;
    return leftKey.localeCompare(rightKey);
  })[0];

  return firstMatch ? parseDateTime(firstMatch.matchDate, firstMatch.startTime) : new Date();
}

function formatClockTime(value: Date) {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function buildTimeWindow(events: CalendarEvent[], minimumHours: number) {
  if (events.length === 0) {
    return { startHour: 8, endHour: 18 };
  }

  const earliestMinutes = Math.min(...events.map((event) => event.startsAt.getHours() * 60 + event.startsAt.getMinutes()));
  const latestMinutes = Math.max(...events.map((event) => event.endsAt.getHours() * 60 + event.endsAt.getMinutes()));

  let startHour = Math.max(6, Math.floor(earliestMinutes / 60) - 1);
  let endHour = Math.min(23, Math.ceil(latestMinutes / 60) + 1);

  if (endHour - startHour < minimumHours) {
    const missingHours = minimumHours - (endHour - startHour);
    const extendBefore = Math.ceil(missingHours / 2);
    const extendAfter = Math.floor(missingHours / 2);

    startHour = Math.max(6, startHour - extendBefore);
    endHour = Math.min(23, endHour + extendAfter);

    if (endHour - startHour < minimumHours) {
      if (startHour === 6) {
        endHour = Math.min(23, startHour + minimumHours);
      } else if (endHour === 23) {
        startHour = Math.max(6, endHour - minimumHours);
      }
    }
  }

  return { startHour, endHour };
}

function getSlotStatus(matches: CalendarEvent[]): MatchStatus {
  if (matches.some((match) => match.status === "live")) {
    return "live";
  }

  if (matches.some((match) => match.status === "scheduled")) {
    return "scheduled";
  }

  return "finished";
}

function buildCalendarEventSlots(events: CalendarEvent[]): CalendarEventSlot[] {
  const grouped = new Map<string, CalendarEvent[]>();

  events.forEach((event) => {
    const slotKey = `${event.dayKey}-${event.startTime}`;
    const bucket = grouped.get(slotKey);
    if (bucket) {
      bucket.push(event);
      return;
    }

    grouped.set(slotKey, [event]);
  });

  return Array.from(grouped.entries())
    .map(([slotId, slotMatches]) => {
      const sortedMatches = [...slotMatches].sort((left, right) => {
        const startDiff = left.startsAt.getTime() - right.startsAt.getTime();
        if (startDiff !== 0) {
          return startDiff;
        }

        return left.matchupLabel.localeCompare(right.matchupLabel);
      });
      const primaryMatch = sortedMatches[0];
      const slotStartsAt = sortedMatches.reduce(
        (earliest, match) => (match.startsAt < earliest ? match.startsAt : earliest),
        primaryMatch.startsAt,
      );
      const slotEndsAt = sortedMatches.reduce(
        (latest, match) => (match.endsAt > latest ? match.endsAt : latest),
        primaryMatch.endsAt,
      );

      return {
        slotId,
        dayKey: primaryMatch.dayKey,
        startsAt: slotStartsAt,
        endsAt: slotEndsAt,
        durationMinutes: Math.max(30, Math.round((slotEndsAt.getTime() - slotStartsAt.getTime()) / 60000)),
        timeLabel: `${formatClockTime(slotStartsAt)} - ${formatClockTime(slotEndsAt)}`,
        status: getSlotStatus(sortedMatches),
        matches: sortedMatches,
        primaryMatch,
      };
    })
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime());
}

function buildDaySlotLayout(slots: CalendarEventSlot[]): PositionedCalendarSlot[] {
  const sortedSlots = [...slots].sort((left, right) => {
    const startDiff = left.startsAt.getTime() - right.startsAt.getTime();
    if (startDiff !== 0) {
      return startDiff;
    }

    return left.endsAt.getTime() - right.endsAt.getTime();
  });

  const positioned: Array<{
    slot: CalendarEventSlot;
    columnIndex: number;
    columnCount: number;
  }> = [];
  let activeIndices: number[] = [];
  let currentGroupIndices: number[] = [];
  let currentGroupMaxColumns = 1;

  const finalizeGroup = () => {
    currentGroupIndices.forEach((index) => {
      positioned[index].columnCount = currentGroupMaxColumns;
    });
    currentGroupIndices = [];
    currentGroupMaxColumns = 1;
  };

  sortedSlots.forEach((slot) => {
    const slotStart = slot.startsAt.getTime();
    activeIndices = activeIndices.filter((index) => positioned[index].slot.endsAt.getTime() > slotStart);

    if (activeIndices.length === 0 && currentGroupIndices.length > 0) {
      finalizeGroup();
    }

    const usedColumns = new Set(activeIndices.map((index) => positioned[index].columnIndex));
    let columnIndex = 0;

    while (usedColumns.has(columnIndex)) {
      columnIndex += 1;
    }

    positioned.push({
      slot,
      columnIndex,
      columnCount: 1,
    });

    const positionedIndex = positioned.length - 1;
    activeIndices.push(positionedIndex);
    currentGroupIndices.push(positionedIndex);
    currentGroupMaxColumns = Math.max(currentGroupMaxColumns, usedColumns.size + 1);
  });

  if (currentGroupIndices.length > 0) {
    finalizeGroup();
  }

  return positioned.map(({ slot, columnIndex, columnCount }) => ({
    ...slot,
    columnIndex,
    columnCount,
  }));
}

function EventCard({
  match,
  compact = false,
  showVenue = true,
  onClick,
}: {
  match: CalendarEvent;
  compact?: boolean;
  showVenue?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        eventToneClassName[match.status],
        compact && "rounded-xl px-2.5 py-2",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em]">
          {match.statusLabel}
        </span>
        <span className="shrink-0 text-[11px] font-semibold">{match.timeLabel}</span>
      </div>
      <p className={cn("mt-1 line-clamp-2 font-semibold", compact ? "text-xs" : "text-sm")} title={match.matchupLabel}>
        {match.matchupLabel}
      </p>
      {!compact && showVenue ? (
        <p className="mt-1 truncate text-xs opacity-80" title={match.venueLabel}>
          {match.venueLabel}
        </p>
      ) : null}
    </button>
  );
}

function GroupEventCard({
  slot,
  onClick,
}: {
  slot: CalendarEventSlot;
  onClick: () => void;
}) {
  const moreCount = slot.matches.length - 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-2xl border px-3 py-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        eventToneClassName[slot.status],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold">{slot.timeLabel}</span>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold">
          {slot.matches.length} partidos
        </span>
      </div>

      <p className="mt-1 line-clamp-2 text-sm font-semibold text-current" title={slot.primaryMatch.matchupLabel}>
        {slot.primaryMatch.matchupLabel}
      </p>

      {moreCount > 0 ? (
        <p className="mt-1 text-xs opacity-80">
          +{moreCount} {moreCount === 1 ? "partido mas" : "partidos mas"}
        </p>
      ) : null}
    </button>
  );
}

function WeekCalendarView({
  days,
  matchesByDay,
  startHour,
  endHour,
  onSelectMatch,
  onSelectGroup,
}: {
  days: Date[];
  matchesByDay: Map<string, CalendarEvent[]>;
  startHour: number;
  endHour: number;
  onSelectMatch: (match: QuickMatchListItem) => void;
  onSelectGroup: (slot: CalendarEventSlot) => void;
}) {
  const isSingleDayView = days.length === 1;
  const slotHeight = 66;
  const totalHours = Math.max(1, endHour - startHour);
  const calendarHeight = totalHours * slotHeight;
  const hourMarks = Array.from({ length: totalHours + 1 }, (_, index) => startHour + index);
  const columnsStyle = {
    gridTemplateColumns: `58px repeat(${days.length}, minmax(0, 1fr))`,
  };

  return (
    <div className="overflow-x-auto rounded-[24px] border border-slate-200 bg-white">
      <div className={cn(days.length === 1 ? "min-w-[360px]" : "min-w-[760px]")}>
        <div className="grid gap-0" style={columnsStyle}>
          <div className="border-b border-slate-200 bg-slate-50/70" />
          {days.map((day) => (
            <div key={getDayKey(day)} className="border-b border-l border-slate-200 bg-slate-50/70 px-2 py-2.5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {weekdayFormatter.format(day)}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">{dayFormatter.format(day)}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={columnsStyle}>
          <div className="relative border-r border-slate-200 bg-slate-50">
            <div style={{ height: calendarHeight }}>
              {hourMarks.slice(0, -1).map((hour, index) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-slate-200 pr-2 text-right text-[10px] font-medium text-slate-400"
                  style={{ top: index * slotHeight }}
                >
                  <span className="-translate-y-2 inline-block bg-slate-50 px-1">
                    {String(hour).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>
          </div>

          {days.map((day) => {
            const dayMatches = matchesByDay.get(getDayKey(day)) ?? [];
            const laidOutMatches = buildDaySlotLayout(buildCalendarEventSlots(dayMatches));

            return (
              <div key={getDayKey(day)} className="relative overflow-hidden border-l border-slate-200 bg-white">
                <div style={{ height: calendarHeight }}>
                  {hourMarks.map((_, index) => (
                    <div
                      key={`${getDayKey(day)}-line-${index}`}
                      className="absolute left-0 right-0 border-t border-slate-100"
                      style={{ top: index * slotHeight }}
                    />
                  ))}

                  {laidOutMatches.map((slot) => {
                    const startMinutes = slot.startsAt.getHours() * 60 + slot.startsAt.getMinutes();
                    const startOffsetMinutes = startHour * 60;
                    const top = ((startMinutes - startOffsetMinutes) / 60) * slotHeight;
                    const height = Math.max(74, (slot.durationMinutes / 60) * slotHeight);
                    const singleEventStyle = isSingleDayView
                      ? {
                          top,
                          height,
                          left: "50%",
                          width: "calc(100% - 1.5rem)",
                          maxWidth: "420px",
                          transform: "translateX(-50%)",
                        }
                      : {
                          top,
                          height,
                          left: "50%",
                          width: "calc(100% - 1rem)",
                          maxWidth: "220px",
                          transform: "translateX(-50%)",
                        };
                    const laneWidth = 100 / slot.columnCount;
                    const sharedEventStyle = {
                      top,
                      height,
                      left: `calc(${laneWidth * slot.columnIndex}% + 0.25rem)`,
                      width: `calc(${laneWidth}% - 0.5rem)`,
                    };
                    const eventFrameStyle = slot.columnCount === 1 ? singleEventStyle : sharedEventStyle;

                    return (
                      <div
                        key={slot.slotId}
                        className="absolute overflow-hidden"
                        style={eventFrameStyle}
                      >
                        <div className="h-full overflow-hidden rounded-xl">
                          {slot.matches.length === 1 ? (
                            <EventCard
                              match={slot.primaryMatch}
                              compact
                              showVenue={false}
                              onClick={() => onSelectMatch(slot.primaryMatch)}
                            />
                          ) : (
                            <GroupEventCard slot={slot} onClick={() => onSelectGroup(slot)} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthCalendarView({
  anchorDate,
  days,
  matchesByDay,
  onSelectMatch,
}: {
  anchorDate: Date;
  days: Date[];
  matchesByDay: Map<string, CalendarEvent[]>;
  onSelectMatch: (match: QuickMatchListItem) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[960px]">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
          {Array.from({ length: 7 }, (_, index) => {
            const day = addDays(startOfWeek(anchorDate), index);
            return (
              <div key={index} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {weekdayFormatter.format(day)}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayMatches = matchesByDay.get(getDayKey(day)) ?? [];
            const isCurrentMonth = day.getMonth() === anchorDate.getMonth();

            return (
              <div
                key={getDayKey(day)}
                className={cn(
                  "min-h-[140px] border-b border-r border-slate-200 px-3 py-3",
                  !isCurrentMonth && "bg-slate-50/70 text-slate-400",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("text-sm font-semibold", isCurrentMonth ? "text-slate-900" : "text-slate-400")}>
                    {dayFormatter.format(day)}
                  </span>
                  {dayMatches.length > 0 ? (
                    <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                      {dayMatches.length}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {dayMatches.slice(0, 3).map((match) => (
                    <EventCard key={match.id} match={match} compact onClick={() => onSelectMatch(match)} />
                  ))}

                  {dayMatches.length > 3 ? (
                    <p className="text-xs font-medium text-slate-500">+{dayMatches.length - 3} partidos mas</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LeagueCalendarPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;

  const { league, matches, teams, loading, error } = useLeagueMatchesData(hasValidLeagueId ? selectedLeagueId : null);
  const modals = useQuickMatchesModals();
  const {
    submitting,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveMatch,
  } = useLeagueMatchesMutations();

  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [teamFilter, setTeamFilter] = useState<number | "all">("all");
  const [anchorDate, setAnchorDate] = useState<Date>(() => getDefaultAnchorDate(matches));
  const [hasAutoAnchored, setHasAutoAnchored] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<CalendarEventSlot | null>(null);

  const calendarMatches = useMemo<CalendarEvent[]>(
    () =>
      [...matches]
        .map((match) => {
          const startsAt = parseDateTime(match.matchDate, match.startTime);
          const endsAt = parseDateTime(match.matchDate, match.endTime);
          const safeEndsAt = endsAt > startsAt ? endsAt : new Date(startsAt.getTime() + 60 * 60 * 1000);

          return {
            ...match,
            startsAt,
            endsAt: safeEndsAt,
            dayKey: getDayKey(startsAt),
            durationMinutes: Math.max(30, Math.round((safeEndsAt.getTime() - startsAt.getTime()) / 60000)),
          };
        })
        .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime()),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    if (teamFilter === "all") {
      return calendarMatches;
    }

    return calendarMatches.filter((match) => match.teamAId === teamFilter || match.teamBId === teamFilter);
  }, [calendarMatches, teamFilter]);

  const viewStart = useMemo(() => getViewStart(anchorDate, viewMode), [anchorDate, viewMode]);
  const viewEnd = useMemo(() => getViewEnd(anchorDate, viewMode), [anchorDate, viewMode]);
  const visibleDays = useMemo(() => getVisibleDays(anchorDate, viewMode), [anchorDate, viewMode]);

  const visibleMatches = useMemo(
    () => filteredMatches.filter((match) => match.startsAt >= viewStart && match.startsAt < viewEnd),
    [filteredMatches, viewEnd, viewStart],
  );

  const matchesByDay = useMemo(() => {
    const grouped = new Map<string, CalendarEvent[]>();

    visibleMatches.forEach((match) => {
      const bucket = grouped.get(match.dayKey);
      if (bucket) {
        bucket.push(match);
        return;
      }

      grouped.set(match.dayKey, [match]);
    });

    return grouped;
  }, [visibleMatches]);

  const visibleAgenda = useMemo(() => visibleMatches.slice(0, 10), [visibleMatches]);

  const timeBounds = useMemo(() => {
    return buildTimeWindow(visibleMatches, 8);
  }, [visibleMatches]);

  const panelError = mutationErrorMessage ?? error;

  useEffect(() => {
    if (hasAutoAnchored || matches.length === 0) {
      return;
    }

    setAnchorDate(getDefaultAnchorDate(matches));
    setHasAutoAnchored(true);
  }, [hasAutoAnchored, matches]);

  const handleSubmit = async (values: Parameters<typeof saveMatch>[0]["values"]) => {
    if (!league) {
      return;
    }

    await saveMatch({
      mode: modals.formMode,
      matchId: modals.editingMatch?.id,
      leagueId: league.id,
      values,
    });
    clearMutationError();
    modals.closeForm();
  };

  const handleCreate = () => {
    if (!league || teams.length < 2) {
      return;
    }

    clearMutationError();
    modals.openCreate();
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1460px]">
        <PageHeader
          title="Calendario de jornadas"
          subtitle="Visualiza los partidos de esta liga en formato calendario y filtra rapidamente por equipo."
          actions={
            <div className="flex flex-wrap gap-2">
              {league ? (
                <Button variant="outline" onClick={() => navigate(`/leagues/${league.id}/matches`)}>
                  Ver partidos
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => navigate(league ? `/leagues/${league.id}` : "/leagues")}>
                Dashboard
              </Button>
            </div>
          }
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {!loading && !hasValidLeagueId ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="El enlace de esta liga es invalido o ya no esta disponible."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {!loading && hasValidLeagueId && !league ? (
            <TableEmptyState
              mode="filtered"
              title="Liga no encontrada"
              description="No encontramos la liga que intentaste abrir."
              actionLabel="Volver a ligas"
              onAction={() => navigate("/leagues")}
            />
          ) : null}

          {league ? (
            <>
              <section className="rounded-[28px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_68%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Vista rapida de calendario</p>
                    <h2 className="mt-2 text-[30px] leading-none text-slate-950 sm:text-[34px]">{league.name}</h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-500">
                      Consulta la programacion semanal, filtra por equipo y abre cada partido sin salir del entorno de la liga.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <UsersRound size={14} />
                      {teams.length} {teams.length === 1 ? "equipo" : "equipos"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <CalendarDays size={14} />
                      {matches.length} {matches.length === 1 ? "partido" : "partidos"}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <Shield size={14} />
                      {league.category}
                    </span>
                    <StatusBadge status={league.status} />
                  </div>
                </div>
              </section>

              <section className="mt-5 rounded-[28px] border border-slate-300 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                      {(Object.keys(viewLabels) as CalendarViewMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setViewMode(mode)}
                          className={cn(
                            "rounded-xl px-4 py-2 text-sm font-semibold transition",
                            viewMode === mode
                              ? "bg-white text-slate-950 shadow-sm"
                              : "text-slate-500 hover:text-slate-800",
                          )}
                        >
                          {viewLabels[mode]}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={() => setAnchorDate((current) => navigateAnchorDate(current, viewMode, -1))}>
                        <ChevronLeft size={16} />
                      </Button>
                      <Button variant="outline" onClick={() => setAnchorDate(new Date())}>
                        Hoy
                      </Button>
                      <Button variant="outline" onClick={() => setAnchorDate((current) => navigateAnchorDate(current, viewMode, 1))}>
                        <ChevronRight size={16} />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select
                      value={String(teamFilter)}
                      onChange={(event) => setTeamFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
                      className="min-w-[220px]"
                    >
                      <option value="all">Filtrar por equipo</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </Select>

                    <Button variant="primary" onClick={handleCreate} disabled={teams.length < 2}>
                      Crear partido
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Rango visible</p>
                    <h3 className="mt-1 text-2xl font-semibold text-slate-950">{buildRangeLabel(anchorDate, viewMode)}</h3>
                  </div>

                  <div className="flex flex-wrap gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5">
                      <Clock3 size={14} />
                      {visibleMatches.length} {visibleMatches.length === 1 ? "partido visible" : "partidos visibles"}
                    </span>
                    {teamFilter !== "all" ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1.5 text-orange-700">
                        Filtrado por equipo
                      </span>
                    ) : null}
                  </div>
                </div>

                {teams.length < 2 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Necesitas al menos 2 equipos dentro de la liga para empezar a llenar este calendario.
                  </div>
                ) : null}

                {visibleMatches.length === 0 ? (
                  <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    No hay partidos en el rango seleccionado. Cambia de semana, ajusta el filtro o crea el primer partido de esta liga.
                  </div>
                ) : viewMode === "month" ? (
                  <div className="mt-4">
                    <MonthCalendarView
                      anchorDate={anchorDate}
                      days={visibleDays}
                      matchesByDay={matchesByDay}
                      onSelectMatch={modals.openDetail}
                    />
                  </div>
                ) : (
                  <div className="mt-4">
                    <WeekCalendarView
                      days={visibleDays}
                      matchesByDay={matchesByDay}
                      startHour={timeBounds.startHour}
                      endHour={timeBounds.endHour}
                      onSelectMatch={modals.openDetail}
                      onSelectGroup={setSelectedSlot}
                    />
                  </div>
                )}
              </section>

              <section className="mt-5 rounded-[28px] border border-slate-300 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Agenda visible</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">Partidos dentro del rango actual</h3>
                  </div>

                  <Button variant="outline" onClick={() => navigate(`/leagues/${league.id}/matches`)}>
                    Abrir gestion de partidos
                  </Button>
                </div>

                {visibleAgenda.length > 0 ? (
                  <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                    {visibleAgenda.map((match) => (
                      <button
                        key={`agenda-${match.id}`}
                        type="button"
                        onClick={() => modals.openDetail(match)}
                        className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:bg-white hover:shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                            {match.dateLabel}
                          </span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              match.status === "live" && "bg-orange-100 text-orange-800",
                              match.status === "scheduled" && "bg-amber-100 text-amber-800",
                              match.status === "finished" && "bg-slate-200 text-slate-700",
                            )}
                          >
                            {match.statusLabel}
                          </span>
                        </div>

                        <p className="mt-2 text-base font-semibold text-slate-950">{match.matchupLabel}</p>
                        <p className="mt-1 text-sm text-slate-500">{match.timeLabel}</p>
                        <p className="mt-2 truncate text-sm text-slate-500" title={match.venueLabel}>
                          {match.venueLabel}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    Aun no hay partidos visibles para esta seleccion.
                  </div>
                )}
              </section>
            </>
          ) : null}
        </Panel>
      </div>

      <QuickMatchFormModal
        isOpen={modals.formOpen}
        mode={modals.formMode}
        initialMatch={modals.editingMatch}
        teams={teams}
        title={modals.formMode === "create" ? "Crear partido de liga" : "Editar partido de liga"}
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          modals.closeForm();
        }}
        onSubmit={handleSubmit}
      />

      <QuickMatchDetailModal
        match={modals.detailMatch}
        isOpen={modals.detailMatch !== null}
        title="Detalle de partido de liga"
        onClose={modals.closeDetail}
      />

      <Modal
        isOpen={selectedSlot !== null}
        onClose={() => setSelectedSlot(null)}
        title={selectedSlot ? `${selectedSlot.matches.length} partidos en ${selectedSlot.timeLabel}` : "Partidos del horario"}
        maxWidthClassName="max-w-3xl"
      >
        {selectedSlot ? (
          <div className="space-y-3">
            {selectedSlot.matches.map((match) => (
              <button
                key={`slot-match-${match.id}`}
                type="button"
                onClick={() => {
                  setSelectedSlot(null);
                  modals.openDetail(match);
                }}
                className="w-full rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {match.dateLabel}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      match.status === "live" && "bg-orange-100 text-orange-800",
                      match.status === "scheduled" && "bg-amber-100 text-amber-800",
                      match.status === "finished" && "bg-slate-200 text-slate-700",
                    )}
                  >
                    {match.statusLabel}
                  </span>
                </div>

                <p className="mt-2 text-base font-semibold text-slate-950">{match.matchupLabel}</p>
                <p className="mt-1 text-sm text-slate-500">{match.timeLabel}</p>
                <p className="mt-2 truncate text-sm text-slate-500" title={match.venueLabel}>
                  {match.venueLabel}
                </p>
              </button>
            ))}

            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setSelectedSlot(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
