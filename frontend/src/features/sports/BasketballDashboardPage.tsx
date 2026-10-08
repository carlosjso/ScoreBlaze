import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  House,
  Layers3,
  ListChecks,
  ShieldCheck,
  Trophy,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/providers/AuthProvider";
import { hasPermission } from "@/features/auth/permissions";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueListItem } from "@/features/leagues/Leagues.types";
import { playersQueryKeys, playersService } from "@/features/players/Players.service";
import { quickMatchesQueryKeys, quickMatchesService } from "@/features/quick-matches/QuickMatches.service";
import {
  formatMatchDate,
  formatMatchTime,
  type ApiMatch,
  type ApiTeamOption,
} from "@/features/quick-matches/QuickMatches.types";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { getBase64ImageSrc } from "@/shared/utils/base64Image";

const DASHBOARD_PAGE_SIZE = 100;

const competitionLabels: Record<LeagueListItem["competitionType"], string> = {
  LEAGUE: "Liga",
  ELIMINATION: "Eliminatoria",
  GROUPS: "Grupos",
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMatchTimestamp(match: ApiMatch) {
  const value = new Date(`${match.match_date}T${match.start_time || "00:00:00"}`).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function TeamMark({ team }: { team: ApiTeamOption | undefined }) {
  const logoSrc = getBase64ImageSrc(team?.logo_base64);

  if (logoSrc) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
        <img src={logoSrc} alt="" className="h-7 w-7 object-contain" />
      </span>
    );
  }

  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">
      {getInitials(team?.name ?? "PD")}
    </span>
  );
}

function DirectoryMark({
  name,
  imageBase64,
  round = false,
}: {
  name: string;
  imageBase64: string | null;
  round?: boolean;
}) {
  const imageSrc = getBase64ImageSrc(imageBase64);
  const shapeClass = round ? "rounded-full" : "rounded-xl";

  if (imageSrc) {
    return (
      <span className={`grid h-11 w-11 shrink-0 place-items-center overflow-hidden border-2 border-white bg-white shadow-sm ${shapeClass}`}>
        <img src={imageSrc} alt="" className="h-full w-full object-contain" />
      </span>
    );
  }

  return (
    <span className={`grid h-11 w-11 shrink-0 place-items-center border-2 border-white bg-slate-100 text-[11px] font-bold text-slate-500 shadow-sm ${shapeClass}`}>
      {getInitials(name)}
    </span>
  );
}

function LeagueLogo({ league }: { league: LeagueListItem }) {
  const logoSrc = getBase64ImageSrc(league.logoBase64);

  if (logoSrc) {
    return <img src={logoSrc} alt="" className="h-10 w-10 rounded-xl object-contain" />;
  }

  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-orange-50 text-xs font-bold text-orange-600">
      {getInitials(league.name)}
    </span>
  );
}

function Metric({
  label,
  value,
  helper,
  icon,
  loading,
  to,
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  loading: boolean;
  to: string;
}) {
  return (
    <Link to={to} className="group min-w-0 px-4 py-3 no-underline transition hover:bg-orange-50/70 sm:px-5">
      <div className="flex items-center justify-between gap-2 text-slate-500">
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">{label}</span>
        </span>
        <ChevronRight size={14} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
      </div>
      <div className="mt-2 flex items-end gap-2">
        <strong className="text-2xl font-bold leading-none text-slate-950">{loading ? "—" : value}</strong>
        <span className="truncate text-xs text-slate-400">{helper}</span>
      </div>
    </Link>
  );
}

function MatchCard({ match, teams }: { match: ApiMatch; teams: ApiTeamOption[] }) {
  const teamA = teams.find((team) => team.id === match.team_a_id);
  const teamB = teams.find((team) => team.id === match.team_b_id);
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";
  const destination = isFinished
    ? match.league_id
      ? `/leagues/${match.league_id}/matches/${match.id}/stats`
      : `/quick-match/${match.id}/stats`
    : match.league_id
      ? `/leagues/${match.league_id}/matches`
      : "/quick-match";

  return (
    <Link
      to={destination}
      className="group block w-full overflow-hidden rounded-[18px] bg-slate-50 p-3 no-underline ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:ring-orange-200"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <CalendarDays size={13} /> {formatMatchDate(match.match_date)}
        </span>
        <span
          className={
            isLive
              ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700"
              : isFinished
                ? "rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600"
                : "rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-orange-700"
          }
        >
          {isLive ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> : null}
          {isLive ? "En vivo" : isFinished ? "Final" : "Próximo"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamMark team={teamA} />
          <strong className="min-w-0 truncate text-xs text-slate-900">{teamA?.name ?? "Equipo A"}</strong>
        </div>
        <div className="min-w-[54px] text-center">
          {(isLive || isFinished) && match.score_team_a !== null && match.score_team_b !== null ? (
            <strong className="whitespace-nowrap text-base font-black tracking-tight text-slate-950">
              {match.score_team_a} <span className="text-slate-300">-</span> {match.score_team_b}
            </strong>
          ) : (
            <>
              <strong className="block text-xs font-black text-slate-300">VS</strong>
              <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                <Clock3 size={11} /> {formatMatchTime(match.start_time)}
              </span>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-row-reverse items-center gap-2">
          <TeamMark team={teamB} />
          <strong className="min-w-0 truncate text-right text-xs text-slate-900">{teamB?.name ?? "Equipo B"}</strong>
        </div>
      </div>
    </Link>
  );
}

export default function BasketballDashboardPage() {
  const { session } = useAuth();
  const canViewLeagues = hasPermission(session, "leagues.view");
  const canViewTeams = hasPermission(session, "teams.view");
  const canViewPlayers = hasPermission(session, "players.view");
  const canViewMatches = hasPermission(session, "quick_match.view");

  const leaguesQuery = useQuery({
    queryKey: leaguesQueryKeys.catalog(),
    queryFn: ({ signal }) => leaguesService.getCatalog(undefined, signal),
    enabled: canViewLeagues,
  });
  const teamsQuery = useQuery({
    queryKey: teamsQueryKeys.table({
      page: 1,
      pageSize: DASHBOARD_PAGE_SIZE,
      search: "",
      sortKey: "name",
      sortDir: "asc",
    }),
    queryFn: ({ signal }) =>
      teamsService.getTablePage(
        {
          page: 1,
          pageSize: DASHBOARD_PAGE_SIZE,
          search: "",
          sortKey: "name",
          sortDir: "asc",
        },
        signal,
      ),
    enabled: canViewTeams,
  });
  const playersQuery = useQuery({
    queryKey: playersQueryKeys.table({
      page: 1,
      pageSize: 5,
      search: "",
      sortKey: "name",
      sortDir: "asc",
    }),
    queryFn: ({ signal }) =>
      playersService.getTablePage(
        {
          page: 1,
          pageSize: 5,
          search: "",
          sortKey: "name",
          sortDir: "asc",
        },
        signal,
      ),
    enabled: canViewPlayers,
  });
  const matchesQuery = useQuery({
    queryKey: quickMatchesQueryKeys.snapshot(),
    queryFn: ({ signal }) => quickMatchesService.getSnapshot(signal),
    enabled: canViewMatches,
  });

  const todayKey = getLocalDateKey();
  const now = Date.now();
  const leagues = leaguesQuery.data ?? [];
  const matches = matchesQuery.data?.matches ?? [];
  const teams = matchesQuery.data?.teams ?? [];
  const activeLeagues = leagues.filter((league) => league.status === "En curso");
  const startingLeagues = leagues.filter((league) => league.status === "Sin empezar");
  const liveMatches = matches.filter((match) => match.status === "live");
  const scheduledMatches = matches
    .filter((match) => match.status === "scheduled")
    .sort((left, right) => getMatchTimestamp(left) - getMatchTimestamp(right));
  const upcomingMatches = scheduledMatches.filter((match) => getMatchTimestamp(match) >= now);
  const overdueMatches = scheduledMatches.filter((match) => getMatchTimestamp(match) < now);
  const todayMatches = matches.filter((match) => match.match_date === todayKey);
  const finishedMatches = matches
    .filter((match) => match.status === "finished")
    .sort((left, right) => getMatchTimestamp(right) - getMatchTimestamp(left));
  const featuredMatches = [...new Map(
    [
      liveMatches[0],
      upcomingMatches[0],
      finishedMatches[0],
      ...liveMatches,
      ...upcomingMatches,
      ...finishedMatches,
    ]
      .filter((match): match is ApiMatch => Boolean(match))
      .map((match) => [match.id, match]),
  ).values()].slice(0, 4);
  const todayLabel = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  const teamsWithoutPlayers = teamsQuery.data?.items.filter((team) => team.playerCount === 0).length ?? 0;
  const groupsPending = leagues.filter(
    (league) => league.competitionType === "GROUPS" && !league.groupStageConfig?.groups.length,
  ).length;
  const hasDashboardError =
    leaguesQuery.isError || teamsQuery.isError || playersQuery.isError || matchesQuery.isError;
  const loadingSummary =
    (canViewLeagues && leaguesQuery.isPending) ||
    (canViewTeams && teamsQuery.isPending) ||
    (canViewPlayers && playersQuery.isPending) ||
    (canViewMatches && matchesQuery.isPending);

  const preparationItems = [
    overdueMatches.length
      ? {
          label: `${overdueMatches.length} ${overdueMatches.length === 1 ? "partido pendiente" : "partidos pendientes"} de actualizar`,
          detail: "La fecha programada ya pasó.",
          to: "/quick-match",
        }
      : null,
    teamsWithoutPlayers
      ? {
          label: `${teamsWithoutPlayers} ${teamsWithoutPlayers === 1 ? "equipo sin plantilla" : "equipos sin plantilla"}`,
          detail: "Asigna jugadores antes de competir.",
          to: "/teams",
        }
      : null,
    groupsPending
      ? {
          label: `${groupsPending} ${groupsPending === 1 ? "torneo sin grupos" : "torneos sin grupos"}`,
          detail: "La distribución todavía no está lista.",
          to: "/leagues?type=GROUPS",
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="sb-page">
      <div className="sb-page-shell space-y-5">
        <section className="relative overflow-hidden rounded-[28px] bg-[#101827] px-6 py-7 text-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] sm:px-8 sm:py-8">
          <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full border-[34px] border-orange-500/15" />
          <div className="absolute bottom-0 right-[18%] h-px w-52 bg-gradient-to-r from-transparent via-orange-400/60 to-transparent" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300 no-underline"
              >
                <House size={16} /> Inicio
              </Link>
              <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Todo el juego, en un vistazo.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
                Revisa la agenda, los resultados y los pendientes de tus competencias antes del siguiente salto.
              </p>
            </div>

            <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-300">Hoy</p>
              <p className="mt-2 capitalize text-base font-semibold text-white">{todayLabel}</p>
              <p className="mt-1 text-xs text-slate-400">
                {todayMatches.length
                  ? `${todayMatches.length} ${todayMatches.length === 1 ? "partido en agenda" : "partidos en agenda"}`
                  : "Sin partidos programados"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid divide-y divide-slate-200 overflow-hidden rounded-[22px] bg-white shadow-sm ring-1 ring-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <Metric
            label="Ligas activas"
            value={activeLeagues.length}
            helper={startingLeagues.length ? `${startingLeagues.length} por iniciar` : "temporadas"}
            icon={<Trophy size={16} />}
            loading={canViewLeagues && leaguesQuery.isPending}
            to="/leagues"
          />
          <Metric
            label="Equipos"
            value={teamsQuery.data?.totalItems ?? 0}
            helper={teamsWithoutPlayers ? `${teamsWithoutPlayers} sin plantilla` : "registrados"}
            icon={<ShieldCheck size={16} />}
            loading={canViewTeams && teamsQuery.isPending}
            to="/teams"
          />
          <Metric
            label="Jugadores"
            value={playersQuery.data?.totalItems ?? 0}
            helper="disponibles"
            icon={<UsersRound size={16} />}
            loading={canViewPlayers && playersQuery.isPending}
            to="/players"
          />
          <Metric
            label="Partidos hoy"
            value={todayMatches.length}
            helper={liveMatches.length ? `${liveMatches.length} en vivo` : "en agenda"}
            icon={<CalendarDays size={16} />}
            loading={canViewMatches && matchesQuery.isPending}
            to="/quick-match"
          />
        </section>

        {hasDashboardError ? (
          <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
            Parte del resumen no pudo actualizarse. Los módulos siguen disponibles desde el menú lateral.
          </div>
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-[26px] bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6 xl:order-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Partidos</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Agenda reciente</h2>
            </div>
            <Link
              to="/quick-match"
              className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 no-underline hover:text-orange-600"
            >
              Ver agenda <ArrowRight size={15} />
            </Link>
          </div>

          {canViewMatches && matchesQuery.isPending ? (
            <div className="mt-5 space-y-3 overflow-hidden">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="h-[92px] w-full animate-pulse rounded-[18px] bg-slate-100" />
              ))}
            </div>
          ) : featuredMatches.length ? (
            <div className="mt-5 space-y-3">
              {featuredMatches.map((match) => (
                <MatchCard key={match.id} match={match} teams={teams} />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-[22px] bg-slate-50 px-5 py-10 text-center">
              <CalendarDays size={24} className="mx-auto text-slate-300" />
              <strong className="mt-3 block text-sm text-slate-900">Todavía no hay partidos</strong>
              <p className="mt-1 text-xs text-slate-500">Aquí aparecerán los encuentros en vivo, próximos y recientes.</p>
            </div>
          )}
        </section>

        <div className="space-y-5 xl:order-1">
          <section className="rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-500">Temporadas</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Ligas en movimiento</h2>
              </div>
              <Link to="/leagues" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 no-underline hover:text-orange-600">
                Ver todas <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {canViewLeagues && leaguesQuery.isPending ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="h-[76px] animate-pulse border-b border-slate-100 bg-slate-50/60" />
                ))
              ) : activeLeagues.length ? (
                activeLeagues.slice(0, 4).map((league) => (
                  <Link
                    key={league.id}
                    to={`/leagues/${league.id}`}
                    className="group flex items-center gap-4 py-4 no-underline"
                  >
                    <LeagueLogo league={league} />
                    <span className="min-w-0 flex-1">
                      <strong className="block truncate text-sm text-slate-950">{league.name}</strong>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span>{competitionLabels[league.competitionType]}</span>
                        <span className="h-1 w-1 rounded-full bg-slate-300" />
                        <span>{league.teamCount} equipos</span>
                      </span>
                    </span>
                    <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 sm:inline-flex">
                      En curso
                    </span>
                    <ChevronRight size={17} className="text-slate-300 group-hover:text-orange-500" />
                  </Link>
                ))
              ) : (
                <div className="py-10 text-center">
                  <Layers3 size={24} className="mx-auto text-slate-300" />
                  <strong className="mt-3 block text-sm text-slate-900">No hay ligas activas</strong>
                  <p className="mt-1 text-xs text-slate-500">Las temporadas en curso aparecerán aquí.</p>
                </div>
              )}
            </div>
          </section>

          {(canViewTeams || canViewPlayers) ? (
            <section className="grid gap-3 sm:grid-cols-2">
              {canViewTeams ? (
                <Link
                  to="/teams"
                  className="group flex min-w-0 items-center gap-4 overflow-hidden rounded-[22px] bg-[#f5f9fc] p-4 no-underline ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:ring-orange-200"
                >
                  <span className="flex min-w-[94px] items-center pl-2">
                    {(teamsQuery.data?.items ?? []).slice(0, 4).map((team, index) => (
                      <span key={team.id} className={index ? "-ml-3" : ""}>
                        <DirectoryMark name={team.name} imageBase64={team.logoBase64} />
                      </span>
                    ))}
                    {!teamsQuery.isPending && !teamsQuery.data?.items.length ? (
                      <span className="grid h-11 w-11 place-items-center rounded-xl border-2 border-white bg-white text-slate-400 shadow-sm">
                        <ShieldCheck size={18} />
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">Plantillas</span>
                    <strong className="mt-1 block truncate text-sm text-slate-950">Explorar equipos</strong>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {teamsQuery.isPending ? "Cargando equipos" : `${teamsQuery.data?.totalItems ?? 0} registrados`}
                    </span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
                </Link>
              ) : null}

              {canViewPlayers ? (
                <Link
                  to="/players"
                  className="group flex min-w-0 items-center gap-4 overflow-hidden rounded-[22px] bg-[#fff8f1] p-4 no-underline ring-1 ring-orange-100 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md hover:ring-orange-200"
                >
                  <span className="flex min-w-[94px] items-center pl-2">
                    {(playersQuery.data?.items ?? []).slice(0, 4).map((player, index) => (
                      <span key={player.id} className={index ? "-ml-3" : ""}>
                        <DirectoryMark name={player.name} imageBase64={player.photoBase64} round />
                      </span>
                    ))}
                    {!playersQuery.isPending && !playersQuery.data?.items.length ? (
                      <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-white bg-white text-orange-400 shadow-sm">
                        <UsersRound size={18} />
                      </span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600">Talento</span>
                    <strong className="mt-1 block truncate text-sm text-slate-950">Ver jugadores</strong>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {playersQuery.isPending ? "Cargando jugadores" : `${playersQuery.data?.totalItems ?? 0} disponibles`}
                    </span>
                  </span>
                  <ChevronRight size={17} className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
                </Link>
              ) : null}
            </section>
          ) : null}

          <section className="rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">Preparación</p>
                <h2 className="mt-2 text-xl font-bold text-slate-950">Antes del próximo juego</h2>
              </div>
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700">
                <ListChecks size={19} />
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {loadingSummary ? (
                Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="h-[68px] animate-pulse rounded-2xl bg-slate-100" />
                ))
              ) : preparationItems.length ? (
                preparationItems.map((item) => (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="group flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 no-underline ring-1 ring-slate-200 transition hover:bg-white hover:shadow-sm hover:ring-orange-200"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-orange-500 shadow-sm ring-1 ring-slate-200">
                      <ListChecks size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-slate-900">{item.label}</strong>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{item.detail}</span>
                    </span>
                    <ChevronRight size={16} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500" />
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl bg-emerald-50 p-5 text-center ring-1 ring-emerald-100 sm:col-span-2">
                  <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                    <ShieldCheck size={20} />
                  </span>
                  <strong className="mt-3 block text-sm text-slate-900">Listos para jugar</strong>
                  <p className="mt-1 text-xs leading-5 text-slate-500">La preparación de tus competencias está al día.</p>
                </div>
              )}
            </div>
          </section>
        </div>
        </div>
      </div>
    </div>
  );
}
