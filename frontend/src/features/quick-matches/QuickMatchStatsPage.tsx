import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CalendarDays, Clock3, MapPin, Search } from "lucide-react";
import { useParams } from "react-router-dom";

import {
  getQuickMatchStatsSnapshot,
  type QuickMatchStatsEvent,
  type QuickMatchStatsEventType,
  type QuickMatchStatsSnapshot,
  type QuickMatchStatsTeamKey,
  type QuickMatchStatsTeamSnapshot,
} from "@/features/quick-matches/QuickMatchStats.service";
import {
  formatMatchDate,
  formatMatchTimeRange,
  getMatchResultLabel,
  getMatchStatusLabel,
} from "@/features/quick-matches/QuickMatches.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { cn } from "@/shared/utils/cn";

type StatsPanel = "stats" | "teamA" | "teamB";

type PlayerStatsRow = {
  key: string;
  label: string;
  name: string;
  shirtNumber: string | null;
  points: number;
  made1: number;
  made2: number;
  made3: number;
  misses: number;
  assists: number;
  rebounds: number;
  fouls: number;
  actions: number;
  madeShots: number;
  shotAttempts: number;
  accuracy: number;
};

type TeamStatsSummary = {
  points: number;
  made1: number;
  made2: number;
  made3: number;
  misses: number;
  assists: number;
  rebounds: number;
  fouls: number;
  actions: number;
  madeShots: number;
  shotAttempts: number;
  accuracy: number;
  pointsPerAction: number;
};

type TeamStatsView = {
  key: QuickMatchStatsTeamKey;
  id: number;
  name: string;
  logoBase64: string | null;
  score: number;
  players: PlayerStatsRow[];
  summary: TeamStatsSummary;
};

type MatchInsightSummary = {
  leadChanges: number;
  ties: number;
  largestLeadA: number;
  largestLeadB: number;
};

type PeriodSummaryColumn = {
  label: string;
  teamA: number;
  teamB: number;
};

type MatchStatsView = {
  match: QuickMatchStatsSnapshot["match"];
  teamA: TeamStatsView;
  teamB: TeamStatsView;
  resultLabel: string;
  hasEvents: boolean;
  insights: MatchInsightSummary;
  periodColumns: PeriodSummaryColumn[];
};

const POINTS_BY_EVENT: Partial<Record<QuickMatchStatsEventType, number>> = {
  point_1: 1,
  point_2: 2,
  point_3: 3,
};

const statusTextClassName = {
  scheduled: "text-sky-600",
  live: "text-amber-600",
  finished: "text-emerald-600",
} as const;

function getEventPoints(eventType: QuickMatchStatsEventType) {
  return POINTS_BY_EVENT[eventType] ?? 0;
}

function formatPercentage(value: number) {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  const rounded = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded}%`;
}

function formatDecimal(value: number) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
}

function createPlayerKey(playerId: number | null, label: string) {
  if (playerId !== null) {
    return `player:${playerId}`;
  }

  return `guest:${label.toLowerCase().replace(/\s+/g, "-")}`;
}

function createEmptyPlayerRow(params: {
  key: string;
  label: string;
  name: string;
  shirtNumber: string | null;
}): PlayerStatsRow {
  return {
    key: params.key,
    label: params.label,
    name: params.name,
    shirtNumber: params.shirtNumber,
    points: 0,
    made1: 0,
    made2: 0,
    made3: 0,
    misses: 0,
    assists: 0,
    rebounds: 0,
    fouls: 0,
    actions: 0,
    madeShots: 0,
    shotAttempts: 0,
    accuracy: 0,
  };
}

function finalizePlayerRow(row: PlayerStatsRow): PlayerStatsRow {
  const madeShots = row.made1 + row.made2 + row.made3;
  const shotAttempts = madeShots + row.misses;
  const accuracy = shotAttempts > 0 ? (madeShots / shotAttempts) * 100 : 0;

  return {
    ...row,
    madeShots,
    shotAttempts,
    accuracy,
  };
}

function comparePlayerRows(left: PlayerStatsRow, right: PlayerStatsRow) {
  return (
    right.points - left.points ||
    right.assists - left.assists ||
    right.rebounds - left.rebounds ||
    right.actions - left.actions ||
    left.label.localeCompare(right.label)
  );
}

function buildTeamStatsView(
  team: QuickMatchStatsTeamSnapshot,
  allEvents: QuickMatchStatsEvent[],
): TeamStatsView {
  const playersMap = new Map<string, PlayerStatsRow>();
  const playersById = new Map(
    team.players
      .filter((player) => player.id !== null)
      .map((player) => [player.id as number, player]),
  );

  const ensurePlayerRow = (params: {
    playerId: number | null;
    label: string;
    name: string;
    shirtNumber: string | null;
  }) => {
    const key = createPlayerKey(params.playerId, params.label);
    const existing = playersMap.get(key);
    if (existing) {
      return existing;
    }

    const nextRow = createEmptyPlayerRow({
      key,
      label: params.label,
      name: params.name,
      shirtNumber: params.shirtNumber,
    });

    playersMap.set(key, nextRow);
    return nextRow;
  };

  for (const player of team.players) {
    ensurePlayerRow({
      playerId: player.id,
      label: player.label,
      name: player.name,
      shirtNumber: player.shirt_number?.trim() || null,
    });
  }

  const baseSummary = {
    points: team.score,
    made1: 0,
    made2: 0,
    made3: 0,
    misses: 0,
    assists: 0,
    rebounds: 0,
    fouls: 0,
    actions: 0,
  };

  for (const event of allEvents) {
    if (event.team_key !== team.key) {
      continue;
    }

    const rosterPlayer =
      event.player_id !== null ? playersById.get(event.player_id) ?? null : null;
    const playerLabel = rosterPlayer?.label ?? event.guest_name?.trim() ?? "Invitado";
    const playerName = rosterPlayer?.name ?? playerLabel;
    const shirtNumber = rosterPlayer?.shirt_number?.trim() || null;
    const playerRow = ensurePlayerRow({
      playerId: event.player_id,
      label: playerLabel,
      name: playerName,
      shirtNumber,
    });

    playerRow.actions += 1;
    baseSummary.actions += 1;

    if (event.event_type === "point_1") {
      playerRow.points += 1;
      playerRow.made1 += 1;
      baseSummary.made1 += 1;
      continue;
    }

    if (event.event_type === "point_2") {
      playerRow.points += 2;
      playerRow.made2 += 1;
      baseSummary.made2 += 1;
      continue;
    }

    if (event.event_type === "point_3") {
      playerRow.points += 3;
      playerRow.made3 += 1;
      baseSummary.made3 += 1;
      continue;
    }

    if (event.event_type === "miss") {
      playerRow.misses += 1;
      baseSummary.misses += 1;
      continue;
    }

    if (event.event_type === "assist") {
      playerRow.assists += 1;
      baseSummary.assists += 1;
      continue;
    }

    if (event.event_type === "rebound") {
      playerRow.rebounds += 1;
      baseSummary.rebounds += 1;
      continue;
    }

    playerRow.fouls += 1;
    baseSummary.fouls += 1;
  }

  const players = [...playersMap.values()]
    .map(finalizePlayerRow)
    .sort(comparePlayerRows);

  const madeShots = baseSummary.made1 + baseSummary.made2 + baseSummary.made3;
  const shotAttempts = madeShots + baseSummary.misses;
  const accuracy = shotAttempts > 0 ? (madeShots / shotAttempts) * 100 : 0;
  const pointsPerAction =
    baseSummary.actions > 0 ? baseSummary.points / baseSummary.actions : 0;

  return {
    key: team.key,
    id: team.id,
    name: team.name,
    logoBase64: team.logo_base64,
    score: team.score,
    players,
    summary: {
      ...baseSummary,
      madeShots,
      shotAttempts,
      accuracy,
      pointsPerAction,
    },
  };
}

function buildMatchInsights(events: QuickMatchStatsEvent[]) {
  let scoreA = 0;
  let scoreB = 0;
  let lastLeader: QuickMatchStatsTeamKey | null = null;
  let leadChanges = 0;
  let ties = 0;
  let largestLeadA = 0;
  let largestLeadB = 0;

  for (const event of events) {
    const points = getEventPoints(event.event_type);
    if (!points) {
      continue;
    }

    if (event.team_key === "A") {
      scoreA += points;
    } else {
      scoreB += points;
    }

    if (scoreA === scoreB) {
      ties += 1;
    }

    const leader = scoreA === scoreB ? null : scoreA > scoreB ? "A" : "B";

    if (leader && lastLeader && leader !== lastLeader) {
      leadChanges += 1;
    }

    if (leader) {
      lastLeader = leader;
    }

    largestLeadA = Math.max(largestLeadA, scoreA - scoreB);
    largestLeadB = Math.max(largestLeadB, scoreB - scoreA);
  }

  return {
    leadChanges,
    ties,
    largestLeadA,
    largestLeadB,
  };
}

function buildPeriodColumns(
  match: QuickMatchStatsSnapshot["match"],
  events: QuickMatchStatsEvent[],
) {
  const periodScores = new Map<number, { teamA: number; teamB: number }>();

  for (const event of events) {
    const points = getEventPoints(event.event_type);
    if (!points) {
      continue;
    }

    const period = Math.max(1, event.period);
    const current = periodScores.get(period) ?? { teamA: 0, teamB: 0 };

    if (event.team_key === "A") {
      current.teamA += points;
    } else {
      current.teamB += points;
    }

    periodScores.set(period, current);
  }

  const columns: PeriodSummaryColumn[] = [1, 2, 3, 4].map((period) => {
    const summary = periodScores.get(period) ?? { teamA: 0, teamB: 0 };
    return {
      label: String(period),
      teamA: summary.teamA,
      teamB: summary.teamB,
    };
  });

  const overtimePeriods = [...periodScores.keys()].filter((period) => period > 4);
  if (overtimePeriods.length > 0) {
    const overtime = overtimePeriods.reduce(
      (summary, period) => {
        const current = periodScores.get(period);
        if (!current) {
          return summary;
        }

        return {
          teamA: summary.teamA + current.teamA,
          teamB: summary.teamB + current.teamB,
        };
      },
      { teamA: 0, teamB: 0 },
    );

    columns.push({
      label: "OT",
      teamA: overtime.teamA,
      teamB: overtime.teamB,
    });
  }

  columns.push({
    label: "T",
    teamA: match.score_team_a ?? 0,
    teamB: match.score_team_b ?? 0,
  });

  return columns;
}

function buildMatchStatsView(snapshot: QuickMatchStatsSnapshot): MatchStatsView {
  const events = snapshot.events
    .filter((event) => event.status === "active")
    .sort((left, right) => left.event_order - right.event_order);

  return {
    match: snapshot.match,
    teamA: buildTeamStatsView(snapshot.team_a, events),
    teamB: buildTeamStatsView(snapshot.team_b, events),
    resultLabel: getMatchResultLabel({
      teamAId: snapshot.match.team_a_id,
      teamBId: snapshot.match.team_b_id,
      teamAName: snapshot.team_a.name,
      teamBName: snapshot.team_b.name,
      scoreTeamA: snapshot.match.score_team_a,
      scoreTeamB: snapshot.match.score_team_b,
      winnerTeamId: snapshot.match.winner_team_id,
      isDraw: snapshot.match.is_draw,
    }),
    hasEvents: events.length > 0,
    insights: buildMatchInsights(events),
    periodColumns: buildPeriodColumns(snapshot.match, events),
  };
}

function StatsShell({ children }: { children: ReactNode }) {
  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[980px]">
        <div className="mx-auto w-full max-w-[860px]">
          <section className="rounded-[30px] border border-slate-300/90 bg-[#fbfbfc] p-2.5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
            <div className="rounded-[26px] border border-slate-200 bg-[#f2f4f7] p-4 sm:p-5">
              {children}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <StatsShell>
      <div className="rounded-[20px] border border-orange-200 bg-orange-50 px-5 py-10 text-center text-sm font-semibold text-orange-700">
        Cargando estadisticas del partido...
      </div>
    </StatsShell>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <StatsShell>
      <div className="rounded-[20px] border border-red-200 bg-red-50 px-5 py-10 text-center text-sm font-semibold text-red-700">
        {message}
      </div>
    </StatsShell>
  );
}

function MatchHero({ stats }: { stats: MatchStatsView }) {
  const venueText = [stats.match.court?.trim(), stats.match.tournament?.trim()]
    .filter(Boolean)
    .join(" - ");

  return (
    <section className="rounded-[22px] border border-slate-200/90 bg-white px-5 py-5 shadow-[0_8px_18px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="flex items-center justify-between gap-3 text-[10px] font-semibold text-slate-400 sm:text-[11px]">
        <span>{stats.match.tournament?.trim() || "Partido rapido"}</span>
        <span className={cn("font-bold", statusTextClassName[stats.match.status])}>
          {getMatchStatusLabel(stats.match.status)}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-start sm:gap-4">
        <div className="w-full text-center sm:self-start">
          <div className="mx-auto flex w-fit items-center justify-center">
            <TeamLogo
              name={stats.teamA.name}
              logoBase64={stats.teamA.logoBase64}
              seed={stats.teamA.id}
              className="h-14 w-14 rounded-[16px] p-1 sm:h-16 sm:w-16"
            />
          </div>
          <p className="mx-auto mt-3 max-w-[190px] text-[14px] font-black leading-tight text-slate-950 sm:text-[15px]">
            {stats.teamA.name}
          </p>
        </div>

        <div className="w-full text-center sm:self-center">
          <div className="flex items-baseline justify-center gap-3">
            <span className="text-[36px] font-black tracking-tight text-slate-950 sm:text-[40px]">
              {stats.teamA.score}
            </span>
            <span className="text-lg font-black text-slate-300 sm:text-xl">-</span>
            <span className="text-[36px] font-black tracking-tight text-slate-950 sm:text-[40px]">
              {stats.teamB.score}
            </span>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-500 sm:text-xs">
            {stats.resultLabel}
          </p>
        </div>

        <div className="w-full text-center sm:self-start">
          <div className="mx-auto flex w-fit items-center justify-center">
            <TeamLogo
              name={stats.teamB.name}
              logoBase64={stats.teamB.logoBase64}
              seed={stats.teamB.id}
              className="h-14 w-14 rounded-[16px] p-1 sm:h-16 sm:w-16"
            />
          </div>
          <p className="mx-auto mt-3 max-w-[190px] text-[14px] font-black leading-tight text-slate-950 sm:text-[15px]">
            {stats.teamB.name}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px] font-semibold text-slate-500 sm:text-xs">
        <span className="inline-flex items-center gap-2">
          <CalendarDays size={14} />
          {formatMatchDate(stats.match.match_date)}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock3 size={14} />
          {formatMatchTimeRange(stats.match.start_time, stats.match.end_time)}
        </span>
        {venueText ? (
          <span className="inline-flex items-center gap-2">
            <MapPin size={14} />
            {venueText}
          </span>
        ) : null}
      </div>
    </section>
  );
}

function PeriodScoreTable({ stats }: { stats: MatchStatsView }) {
  return (
    <section className="w-full rounded-[18px] border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
      <div className="overflow-hidden rounded-[14px] border border-slate-100 bg-white">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead>
            <tr className="bg-[#f6f7f9]">
              <th className="px-4 py-2 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Equipos
              </th>
              {stats.periodColumns.map((column) => (
                <th
                  key={column.label}
                  className="px-2 py-2 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-t border-slate-100 px-4 py-2.5 font-semibold text-slate-900">
                {stats.teamA.name}
              </td>
              {stats.periodColumns.map((column) => (
                <td
                  key={`period-a-${column.label}`}
                  className="border-t border-slate-100 px-2 py-2.5 text-center font-semibold text-slate-700"
                >
                  {column.teamA}
                </td>
              ))}
            </tr>
            <tr>
              <td className="border-t border-slate-100 px-4 py-2.5 font-semibold text-slate-900">
                {stats.teamB.name}
              </td>
              {stats.periodColumns.map((column) => (
                <td
                  key={`period-b-${column.label}`}
                  className="border-t border-slate-100 px-2 py-2.5 text-center font-semibold text-slate-700"
                >
                  {column.teamB}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SelectorCard({
  active,
  title,
  subtitle,
  children,
  onClick,
  className,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[104px] w-full flex-col items-center justify-center gap-2.5 px-4 py-3.5 text-center transition",
        active ? "bg-[#f6f7fa]" : "bg-white hover:bg-slate-50",
        className,
      )}
    >
      <p className="min-h-[32px] text-[13px] font-black leading-tight text-slate-900">
        {title}
      </p>
      {children}
      <p className="text-[10px] font-semibold text-slate-400">{subtitle}</p>
    </button>
  );
}

function StatsSwitcher({
  stats,
  activePanel,
  onChange,
}: {
  stats: MatchStatsView;
  activePanel: StatsPanel;
  onChange: (panel: StatsPanel) => void;
}) {
  return (
    <section className="w-full overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="grid sm:grid-cols-3">
        <SelectorCard
          active={activePanel === "teamA"}
          title={stats.teamA.name}
          subtitle="Jugadores"
          onClick={() => onChange("teamA")}
          className="border-b border-slate-200 sm:border-b-0 sm:border-r"
        >
          <TeamLogo
            name={stats.teamA.name}
            logoBase64={stats.teamA.logoBase64}
            seed={stats.teamA.id}
            className="h-12 w-12 rounded-[14px] border border-slate-200 bg-white p-1.5"
          />
        </SelectorCard>

        <SelectorCard
          active={activePanel === "stats"}
          title="Estadisticas"
          subtitle="Informacion del partido"
          onClick={() => onChange("stats")}
          className="border-b border-slate-200 sm:border-b-0 sm:border-r"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
            <BarChart3 size={18} />
          </div>
        </SelectorCard>

        <SelectorCard
          active={activePanel === "teamB"}
          title={stats.teamB.name}
          subtitle="Jugadores"
          onClick={() => onChange("teamB")}
        >
          <TeamLogo
            name={stats.teamB.name}
            logoBase64={stats.teamB.logoBase64}
            seed={stats.teamB.id}
            className="h-12 w-12 rounded-[14px] border border-slate-200 bg-white p-1.5"
          />
        </SelectorCard>
      </div>
    </section>
  );
}

function MatchStatsTable({ stats }: { stats: MatchStatsView }) {
  const rows = [
    { label: "Puntos", teamA: String(stats.teamA.score), teamB: String(stats.teamB.score) },
    { label: "Triples", teamA: String(stats.teamA.summary.made3), teamB: String(stats.teamB.summary.made3) },
    { label: "Dobles", teamA: String(stats.teamA.summary.made2), teamB: String(stats.teamB.summary.made2) },
    { label: "Tiros libres", teamA: String(stats.teamA.summary.made1), teamB: String(stats.teamB.summary.made1) },
    { label: "Tiros convertidos", teamA: String(stats.teamA.summary.madeShots), teamB: String(stats.teamB.summary.madeShots) },
    { label: "Intentos registrados", teamA: String(stats.teamA.summary.shotAttempts), teamB: String(stats.teamB.summary.shotAttempts) },
    { label: "Efectividad", teamA: formatPercentage(stats.teamA.summary.accuracy), teamB: formatPercentage(stats.teamB.summary.accuracy) },
    { label: "Asistencias", teamA: String(stats.teamA.summary.assists), teamB: String(stats.teamB.summary.assists) },
    { label: "Rebotes", teamA: String(stats.teamA.summary.rebounds), teamB: String(stats.teamB.summary.rebounds) },
    { label: "Faltas", teamA: String(stats.teamA.summary.fouls), teamB: String(stats.teamB.summary.fouls) },
    { label: "Cambios de lider", teamA: String(stats.insights.leadChanges), teamB: String(stats.insights.leadChanges) },
    { label: "Empates", teamA: String(stats.insights.ties), teamB: String(stats.insights.ties) },
    { label: "Max. ventaja", teamA: String(stats.insights.largestLeadA), teamB: String(stats.insights.largestLeadB) },
    { label: "Pts por accion", teamA: formatDecimal(stats.teamA.summary.pointsPerAction), teamB: formatDecimal(stats.teamB.summary.pointsPerAction) },
  ];

  return (
    <section className="w-full rounded-[18px] border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="overflow-hidden rounded-[16px] border border-slate-200">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-50">
              <th className="w-[28%] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <TeamLogo
                    name={stats.teamA.name}
                    logoBase64={stats.teamA.logoBase64}
                    seed={stats.teamA.id}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="truncate">{stats.teamA.name}</span>
                </div>
              </th>
              <th className="w-[44%] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Estadisticas
              </th>
              <th className="w-[28%] px-4 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                <div className="flex items-center justify-center gap-2">
                  <span className="truncate">{stats.teamB.name}</span>
                  <TeamLogo
                    name={stats.teamB.name}
                    logoBase64={stats.teamB.logoBase64}
                    seed={stats.teamB.id}
                    className="h-5 w-5 rounded-full"
                  />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-900">
                  {row.teamA}
                </td>
                <td className="border-t border-slate-100 px-4 py-2.5 text-center text-[13px] font-medium text-slate-500">
                  {row.label}
                </td>
                <td className="border-t border-slate-100 px-4 py-2.5 text-center text-sm font-semibold text-slate-900">
                  {row.teamB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamPlayersTable({ team }: { team: TeamStatsView }) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    setSearch("");
  }, [team.id]);

  const visiblePlayers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) {
      return team.players;
    }

    return team.players.filter((player) => {
      return (
        player.label.toLowerCase().includes(normalized) ||
        player.name.toLowerCase().includes(normalized) ||
        (player.shirtNumber?.toLowerCase().includes(normalized) ?? false)
      );
    });
  }, [search, team.players]);

  const teamTripleTotal = team.summary.made3;
  const teamPointsTotal = team.score;

  return (
    <section className="w-full overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">Alineaciones</p>

        <label className="flex h-9 w-[170px] max-w-full items-center gap-2 rounded-[14px] border border-slate-200 bg-white px-3 text-xs text-slate-500">
          <Search size={14} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar"
            className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs font-medium text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
      </div>

      <div className="overflow-x-auto overscroll-x-contain border-t border-slate-100">
        <table className="w-full min-w-[980px] border-separate border-spacing-0 text-[11px] sm:text-xs">
          <colgroup>
            <col className="w-[280px]" />
            <col className="w-[72px]" />
            <col className="w-[72px]" />
            <col className="w-[72px]" />
            <col className="w-[72px]" />
            <col className="w-[96px]" />
            <col className="w-[96px]" />
            <col className="w-[72px]" />
            <col className="w-[72px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
          </colgroup>
          <thead>
            <tr>
              <th className="border-b border-slate-100 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                Jugador
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                PTS
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                T1
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                T2
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                T3
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                T3 Eq%
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                PTS Eq%
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                AST
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                REB
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                FLT
              </th>
              <th className="border-b border-slate-100 px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
                Efectividad
              </th>
            </tr>
          </thead>
          <tbody>
            {visiblePlayers.map((player) => (
              <tr key={player.key}>
                <td className="border-b border-slate-100 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    {player.shirtNumber ? (
                      <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 px-1.5 text-[9px] font-black text-orange-600">
                        {player.shirtNumber}
                      </span>
                    ) : (
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-50 text-[9px] font-black text-orange-600">
                        {player.label.slice(0, 2).toUpperCase()}
                      </span>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold text-slate-950 sm:text-[12px]">
                        {player.label}
                      </p>
                      {player.name !== player.label ? (
                        <p className="truncate text-[10px] font-semibold text-slate-400">
                          {player.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-black text-slate-950">
                  {player.points}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {player.made1}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {player.made2}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {player.made3}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {formatPercentage(teamTripleTotal > 0 ? (player.made3 / teamTripleTotal) * 100 : 0)}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {formatPercentage(teamPointsTotal > 0 ? (player.points / teamPointsTotal) * 100 : 0)}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {player.assists}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {player.rebounds}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {player.fouls}
                </td>
                <td className="border-b border-slate-100 px-2 py-3 text-center font-semibold text-slate-600">
                  {formatPercentage(player.accuracy)}
                </td>
              </tr>
            ))}
            {visiblePlayers.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="border-t border-slate-100 px-4 py-8 text-center text-sm font-medium text-slate-500"
                >
                  No hay jugadores que coincidan con la busqueda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function QuickMatchStatsPage() {
  const { matchId } = useParams();
  const numericMatchId = matchId ? Number(matchId) : Number.NaN;
  const [activePanel, setActivePanel] = useState<StatsPanel>("stats");

  const statsQuery = useQuery({
    queryKey: ["quick-match-stats", numericMatchId],
    enabled: Number.isFinite(numericMatchId),
    queryFn: ({ signal }) => getQuickMatchStatsSnapshot(numericMatchId, signal),
  });

  const stats = useMemo(
    () => (statsQuery.data ? buildMatchStatsView(statsQuery.data) : null),
    [statsQuery.data],
  );

  if (!Number.isFinite(numericMatchId)) {
    return <ErrorState message="La ruta del partido no es valida." />;
  }

  if (statsQuery.isPending) {
    return <LoadingState />;
  }

  if (!stats || statsQuery.error) {
    const errorMessage =
      statsQuery.error instanceof Error
        ? statsQuery.error.message
        : "No se pudieron cargar las estadisticas del partido.";

    return <ErrorState message={errorMessage} />;
  }

  const selectedTeam =
    activePanel === "teamA"
      ? stats.teamA
      : activePanel === "teamB"
        ? stats.teamB
        : null;

  return (
    <StatsShell>
      <div className="space-y-4">
        <MatchHero stats={stats} />
        <PeriodScoreTable stats={stats} />
        <StatsSwitcher
          stats={stats}
          activePanel={activePanel}
          onChange={setActivePanel}
        />

        {activePanel === "stats" ? (
          <>
            <MatchStatsTable stats={stats} />

            {!stats.hasEvents ? (
              <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm font-semibold text-slate-600">
                Aun no hay jugadas registradas para calcular mas detalle del partido.
              </div>
            ) : null}
          </>
        ) : selectedTeam ? (
          <TeamPlayersTable team={selectedTeam} />
        ) : null}
      </div>
    </StatsShell>
  );
}
