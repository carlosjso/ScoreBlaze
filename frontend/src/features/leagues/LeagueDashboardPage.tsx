import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListOrdered,
  Swords,
  Settings2,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { buildLeagueLeaderPreviewItems } from "@/features/leagues/leagueLeaders";
import { getCompetitionCapabilities } from "@/features/leagues/competitionCapabilities";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueListItem } from "@/features/leagues/Leagues.types";
import { buildLiveLeagueStandings } from "@/features/leagues/realtime/leagueStandingsRealtime";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { Button, PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type DashboardActionCard = {
  title: string;
  description: string;
  icon: ReactNode;
  to?: string;
  badge?: string;
  disabled?: boolean;
};

function DashboardAction({
  item,
  leagueId,
}: {
  item: DashboardActionCard;
  leagueId: number;
}) {
  const content = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition group-hover:border-orange-200 group-hover:bg-orange-50 group-hover:text-orange-600">
        {item.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="block text-lg font-semibold leading-none tracking-tight text-slate-900">
            {item.title}
          </span>
          {item.badge ? (
            <span className="rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-orange-600">
              {item.badge}
            </span>
          ) : null}
        </span>

        <span className="mt-2 block text-[11px] leading-4 text-slate-500">
          {item.description}
        </span>
      </span>

      <ChevronRight size={16} className="shrink-0 text-slate-300 transition group-hover:text-orange-500" />
    </>
  );

  if (!item.to || item.disabled) {
    return (
      <div
        className={cn(
          "group flex min-h-[92px] items-center gap-4 rounded-[18px] border border-slate-200 bg-slate-50/70 px-4 py-4 text-slate-800 shadow-[0_8px_20px_rgba(15,23,42,0.04)]",
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={item.to.replace(":leagueId", String(leagueId))}
      className={cn(
        "group flex min-h-[92px] items-center gap-4 rounded-[18px] border border-slate-300 bg-white px-4 py-4 text-slate-800 no-underline shadow-[0_8px_20px_rgba(15,23,42,0.06)] transition duration-200",
        "hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_14px_28px_rgba(249,115,22,0.14)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2",
      )}
    >
      {content}
    </Link>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "accent" | "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-[20px] border bg-white px-4 py-4 shadow-sm",
        tone === "default" && "border-slate-200",
        tone === "accent" && "border-orange-200 bg-orange-50/70",
        tone === "success" && "border-emerald-200 bg-emerald-50/80",
        tone === "warning" && "border-amber-200 bg-amber-50/80",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function GroupPreparationCard({ league, onNavigate }: { league: LeagueListItem; onNavigate: (path: string) => void }) {
  const hasEnoughTeams = league.teamCount >= 4;
  const hasGroups = Boolean(league.groupStageConfig);
  const groupCount = league.groupStageConfig?.groups.length ?? 0;
  const assignedCount = league.groupStageConfig?.groups.reduce((total, group) => total + group.teamIds.length, 0) ?? 0;
  const destination = hasEnoughTeams ? `/leagues/${league.id}/groups` : `/leagues/${league.id}/teams/manage`;
  const actionLabel = hasGroups ? "Revisar grupos" : hasEnoughTeams ? "Distribuir equipos" : "Reunir equipos";

  const steps = [
    { label: "Torneo creado", detail: "Datos generales listos", complete: true },
    {
      label: "Equipos reunidos",
      detail: `${league.teamCount} ${league.teamCount === 1 ? "equipo inscrito" : "equipos inscritos"}`,
      complete: hasEnoughTeams,
    },
    {
      label: "Grupos definidos",
      detail: hasGroups ? `${groupCount} grupos, ${assignedCount} equipos` : "Distribucion pendiente",
      complete: hasGroups,
    },
  ];

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,#eff9ff_0%,#ffffff_52%,#fff7ed_100%)] shadow-[0_16px_38px_rgba(14,116,144,0.08)]">
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-sky-700">Preparacion del torneo</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">
            {hasGroups ? "La fase de grupos esta lista" : hasEnoughTeams ? "Ya puedes formar los grupos" : "Primero reune a los participantes"}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {hasGroups
              ? "La distribucion quedo guardada y protegida. Desde Configurar modo puedes revisar sus reglas."
              : hasEnoughTeams
                ? "La lista de participantes ya permite crear al menos dos grupos validos."
                : `Necesitas al menos 4 equipos. Faltan ${Math.max(0, 4 - league.teamCount)} para continuar.`}
          </p>
        </div>
        <Button variant="primary" onClick={() => onNavigate(destination)} className="shrink-0">
          {actionLabel}
          <ArrowRight size={15} />
        </Button>
      </div>

      <div className="grid border-t border-sky-100 bg-white/70 sm:grid-cols-3">
        {steps.map((step, index) => {
          const active = !step.complete && steps.slice(0, index).every((candidate) => candidate.complete);
          return (
            <div key={step.label} className="flex items-center gap-3 border-b border-sky-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
              <span className={cn(
                "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black",
                step.complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : active
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-200 bg-slate-50 text-slate-400",
              )}>
                {step.complete ? <CheckCircle2 size={17} /> : index + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-slate-900">{step.label}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">{step.detail}</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function LeagueDashboardPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;
  const liveMatchesSnapshot = useLeagueMatchesData(hasValidLeagueId ? selectedLeagueId : null);

  const detailQuery = useQuery({
    queryKey: leaguesQueryKeys.detail(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeague(selectedLeagueId, signal),
    enabled: hasValidLeagueId,
  });

  const statsQuery = useQuery({
    queryKey: leaguesQueryKeys.stats(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeagueStats(selectedLeagueId, signal),
    enabled: hasValidLeagueId,
  });

  const league = detailQuery.data ?? null;
  const stats = statsQuery.data ?? null;
  const loading = detailQuery.isPending || statsQuery.isPending;
  const panelError = detailQuery.error instanceof Error ? detailQuery.error.message : null;
  const statsError = statsQuery.error instanceof Error ? statsQuery.error.message : null;
  const standingsSnapshot = useMemo(
    () => (stats ? buildLiveLeagueStandings(stats.standings, league?.bracketGenerated ? [] : liveMatchesSnapshot.matches, league?.standingsTiebreakers) : null),
    [league?.bracketGenerated, league?.standingsTiebreakers, liveMatchesSnapshot.matches, stats],
  );
  const standingsRows = standingsSnapshot?.rows ?? [];
  const hasLiveStandings = (standingsSnapshot?.liveMatchCount ?? 0) > 0;
  const leaderPreviewItems = useMemo(() => buildLeagueLeaderPreviewItems(stats, league?.competitionType), [league?.competitionType, stats]);
  const capabilities = league ? getCompetitionCapabilities(league) : null;
  const groupSetupPending = league?.competitionType === "GROUPS" && !league.groupStageConfig;
  const [activeLeaderPage, setActiveLeaderPage] = useState(0);

  const actions: DashboardActionCard[] = [
    {
      title: "Equipos",
      description: "Consulta los equipos actuales inscritos en esta competencia.",
      icon: <UsersRound size={18} />,
      to: "/leagues/:leagueId/teams",
    },
    {
      title: league?.competitionType === "GROUPS" ? "Grupos" : "Gestionar equipos",
      description: league?.competitionType === "GROUPS"
        ? groupSetupPending
          ? "Reune participantes y despues distribuyelos por grupo."
          : "Revisa la distribucion y las reglas de cada grupo."
        : "Agrega, quita o reordena los equipos de esta liga.",
      icon: <LayoutGrid size={18} />,
      to: league?.competitionType === "GROUPS" && league.teamCount >= 4
        ? "/leagues/:leagueId/groups"
        : "/leagues/:leagueId/teams/manage",
    },
    {
      title: "Calendario",
      description: "Visualiza las jornadas de la competencia en formato calendario.",
      icon: <CalendarDays size={18} />,
      to: "/leagues/:leagueId/calendar",
      disabled: !capabilities?.showLeagueCalendar || groupSetupPending,
    },
    {
      title: "Llaves",
      description: "Organiza y consulta cruces de bracket, semifinales, finales o eliminatorias.",
      icon: <Trophy size={18} />,
      to: "/leagues/:leagueId/bracket",
      disabled: !capabilities?.showBracket,
    },
    {
      title: "Partidos",
      description: "Programa, edita y controla los partidos competitivos.",
      icon: <Swords size={18} />,
      to: "/leagues/:leagueId/matches",
      disabled: groupSetupPending,
    },
    {
      title: "Tabla de posiciones",
      description: "Revisa la tabla actual con puntos, victorias y diferencia.",
      icon: <ListOrdered size={18} />,
      to: "/leagues/:leagueId/standings",
      disabled: !capabilities?.showStandings || groupSetupPending || league?.competitionType === "GROUPS",
    },
    {
      title: "Ajustes de liga",
      description: "Edita nombre, fechas, categoria, logo y estadisticas.",
      icon: <Settings2 size={18} />,
      to: "/leagues/:leagueId/settings",
    },
  ];
  const visibleActions = actions.filter((item) => !item.disabled);

  const updatedAtLabel =
    stats?.updatedAt
      ? new Date(stats.updatedAt).toLocaleString("es-MX", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;
  const hasAnyLeaderHighlights = leaderPreviewItems.length > 0;
  const leaderPageCount = Math.max(1, Math.ceil(leaderPreviewItems.length / 3));
  const visibleLeaderItems = leaderPreviewItems.slice(activeLeaderPage * 3, activeLeaderPage * 3 + 3);
  const visibleLeaderSlots: Array<(typeof leaderPreviewItems)[number] | null> = [...visibleLeaderItems];
  while (visibleLeaderSlots.length < 3) {
    visibleLeaderSlots.push(null);
  }
  const goToRecords = () => navigate(`/leagues/${league?.id}/records`);
  const goPrevLeader = () => {
    if (leaderPageCount <= 1) {
      return;
    }
    setActiveLeaderPage((current) =>
      current === 0 ? leaderPageCount - 1 : current - 1,
    );
  };
  const goNextLeader = () => {
    if (leaderPageCount <= 1) {
      return;
    }
    setActiveLeaderPage((current) => (current + 1) % leaderPageCount);
  };

  useEffect(() => {
    setActiveLeaderPage(0);
  }, [league?.id, leaderPageCount]);

  useEffect(() => {
    if (leaderPageCount <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveLeaderPage((current) => (current + 1) % leaderPageCount);
    }, 3600);

    return () => window.clearInterval(intervalId);
  }, [leaderPageCount]);

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1320px]">
        <PageHeader
          title={league?.competitionType === "ELIMINATION" ? "Centro de eliminatoria" : league?.competitionType === "GROUPS" ? "Centro de grupos" : "Centro de liga"}
          subtitle="Administra esta competencia desde un solo lugar: equipos, partidos, estructura y ajustes."
          actions={<LeagueSectionNav league={league} active="dashboard" />}
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {statsError && !loading ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No pudimos cargar el resumen de estadisticas de la liga. Aun puedes usar el resto de accesos.
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
              <section className="rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="rounded-[26px] border border-slate-200 bg-white px-5 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-6">
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <TeamLogo
                        name={league.name}
                        logoBase64={league.logoBase64}
                        seed={league.id}
                        className="h-20 w-20 shrink-0 rounded-[24px] text-xl shadow-sm"
                        imageClassName="p-2"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
                            <Trophy size={12} />
                            {league.competitionType === "ELIMINATION" ? "Eliminatoria" : league.competitionType === "GROUPS" ? "Grupos" : "Liga"} #{league.id}
                          </span>
                          {capabilities ? (
                            <span className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">
                              {capabilities.label}
                            </span>
                          ) : null}
                          <StatusBadge status={league.status} />
                          <span
                            className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600"
                            title={league.category}
                          >
                            <Shield size={12} className="shrink-0" />
                            <span className="min-w-0 truncate">{league.category}</span>
                          </span>
                        </div>

                        <h3 className="mt-3 max-w-full truncate text-[30px] leading-none text-slate-950 sm:text-[34px]" title={league.name}>
                          {league.name}
                        </h3>
                        <p className="mt-2 text-sm text-slate-500">
                          {league.startDate} - {league.endDate}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {league.trackedStats.map((stat) => (
                            <span key={stat} className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                              {stat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[420px] xl:max-w-[460px]">
                      <SummaryCard label="Equipos" value={stats?.overview.teamsCount ?? league.teamCount} />
                      <SummaryCard label="Partidos" value={stats?.overview.totalMatches ?? 0} tone="accent" />
                      <SummaryCard label="En juego" value={stats?.overview.liveMatches ?? 0} tone="success" />
                      <SummaryCard label="Pendientes" value={stats?.overview.scheduledMatches ?? 0} tone="warning" />
                    </div>
                  </div>
                </div>
              </section>

              {league.competitionType === "GROUPS" ? <GroupPreparationCard league={league} onNavigate={navigate} /> : null}

              <section className="mt-5 rounded-[30px] border border-slate-300 bg-[linear-gradient(180deg,#fcfcfd_0%,#f6f7f9_100%)] p-2 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                <div className="rounded-[26px] border border-slate-200 bg-white px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Menu principal
                      </p>
                      <h3 className="mt-1 text-2xl font-semibold text-slate-950">Todo lo importante de la competencia</h3>
                    </div>
                    {updatedAtLabel ? (
                      <p className="text-xs text-slate-500">Actualizado: {updatedAtLabel}</p>
                    ) : null}
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    {visibleActions.slice(0, 3).map((item) => (
                      <DashboardAction key={item.title} item={item} leagueId={league.id} />
                    ))}
                  </div>

                  <div className="mt-6 grid gap-4 lg:mt-10 lg:grid-cols-3">
                    {visibleActions.slice(3).map((item) => (
                      <DashboardAction key={item.title} item={item} leagueId={league.id} />
                    ))}
                  </div>
                </div>
              </section>

              <div className={cn("mt-5 grid gap-5", capabilities?.showStandings ? "xl:grid-cols-[1.15fr_0.85fr]" : "xl:grid-cols-1")}>
                {capabilities?.showStandings ? (
                <section className="rounded-[28px] border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{capabilities.showGroups ? "Fase actual" : "Tabla actual"}</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-950">{capabilities.showGroups ? "Carpetas de grupos" : "Posiciones de la liga"}</h3>
                      {hasLiveStandings ? (
                        <p className="mt-1 text-xs font-medium text-orange-600">
                          Tabla provisional en vivo
                        </p>
                      ) : null}
                    </div>

                    <Button variant="outline" onClick={() => navigate(
                      capabilities.showGroups ? `/leagues/${league.id}/groups` : `/leagues/${league.id}/standings`,
                    )}>
                      {capabilities.showGroups ? "Abrir grupos" : "Ver tabla"}
                    </Button>
                  </div>

                  {capabilities.showGroups && (stats?.groupStandings.length ?? 0) > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {stats?.groupStandings.map((group) => (
                        <div key={group.groupKey} className="rounded-[18px] border border-sky-100 bg-sky-50/60 px-4 py-3">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">{group.groupName}</p>
                          <p className="mt-1 truncate text-sm font-bold text-slate-900">{group.standings[0]?.teamName ?? "Sin equipos"}</p>
                          <p className="mt-1 text-xs text-slate-500">{group.matchCount} partidos registrados</p>
                        </div>
                      ))}
                    </div>
                  ) : standingsRows.length > 0 ? (
                    <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
                      <div className="grid grid-cols-[56px_minmax(0,1fr)_72px_72px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <span>Pos</span>
                        <span>Equipo</span>
                        <span className="text-center">PJ</span>
                        <span className="text-center">PTS</span>
                      </div>

                      {standingsRows.slice(0, 5).map((row) => (
                        <div
                          key={row.teamId}
                          className="grid grid-cols-[56px_minmax(0,1fr)_72px_72px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
                        >
                          <span className="font-semibold text-slate-500">{row.position}</span>
                          <span className="min-w-0">
                            <span className="truncate font-semibold text-slate-900" title={row.teamName}>
                              {row.teamName}
                            </span>
                            {row.isLive && row.liveSummary ? (
                              <span className="mt-1 block truncate text-xs font-medium text-orange-600" title={row.liveSummary}>
                                {row.liveSummary}
                              </span>
                            ) : null}
                          </span>
                          <span className="text-center text-slate-600">{row.matchesPlayed}</span>
                          <span className="text-center font-semibold text-slate-900">{row.standingsPoints}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                      Todavia no hay suficientes resultados para construir la tabla de posiciones.
                    </div>
                  )}
                </section>
                ) : null}

                <section className="rounded-[28px] border border-slate-300 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Resumen deportivo</p>
                      <h3 className="mt-1 text-xl font-semibold text-slate-950">Lideres de la competencia</h3>
                      <p className="mt-1 text-xs text-slate-500">Vista previa rotativa de los records actuales.</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {leaderPageCount > 1 ? (
                        <>
                          <Button variant="ghost" onClick={goPrevLeader} className="rounded-full px-3 py-2">
                            <ChevronLeft size={16} />
                          </Button>
                          <Button variant="ghost" onClick={goNextLeader} className="rounded-full px-3 py-2">
                            <ChevronRight size={16} />
                          </Button>
                        </>
                      ) : null}
                      <Button variant="outline" onClick={goToRecords}>
                        Ver todos
                      </Button>
                    </div>
                  </div>

                  {visibleLeaderItems.length > 0 ? (
                    <button
                      type="button"
                      onClick={goToRecords}
                      className="mt-4 flex w-full flex-col rounded-[24px] border border-orange-200 bg-[linear-gradient(135deg,#fff9f2_0%,#ffffff_60%,#fff7ed_100%)] px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_16px_28px_rgba(249,115,22,0.14)]"
                    >
                      <div className="grid gap-2.5">
                        {visibleLeaderSlots.map((leader, index) =>
                          leader ? (
                            <div
                              key={leader.key}
                              className="rounded-[16px] border border-white/80 bg-white/90 px-3 py-2.5 shadow-sm"
                            >
                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-orange-500">
                                {leader.label}
                              </p>
                              <p className="mt-1.5 line-clamp-1 text-base font-black leading-none text-slate-950">
                                {leader.title}
                              </p>
                              <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                                {leader.subtitle ?? "Lider actual de la competencia"}
                              </p>
                              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">
                                {leader.valueLabel}
                              </p>
                            </div>
                          ) : (
                            <div
                              key={`leader-empty-${activeLeaderPage}-${index}`}
                              aria-hidden="true"
                              className="rounded-[16px] border border-dashed border-slate-200 bg-white/60 px-3 py-2.5 shadow-sm"
                            >
                              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-300">
                                Sin record
                              </p>
                              <p className="mt-1.5 line-clamp-1 text-base font-black leading-none text-slate-300">
                                --
                              </p>
                              <p className="mt-1 line-clamp-1 text-[11px] text-slate-300">
                                Espacio reservado
                              </p>
                              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                                --
                              </p>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {Array.from({ length: leaderPageCount }, (_, index) => (
                            <span
                              key={`leader-page-${index}`}
                              className={cn(
                                "h-2.5 w-2.5 rounded-full transition",
                                index === activeLeaderPage ? "bg-orange-500" : "bg-slate-300",
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-semibold text-slate-500">
                          Toca para ver todos los records
                        </span>
                      </div>
                    </button>
                  ) : null}

                  {!hasAnyLeaderHighlights ? (
                    <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                      Aun no hay suficientes partidos para mostrar lideres destacados en esta liga.
                    </div>
                  ) : null}
                </section>
              </div>
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
