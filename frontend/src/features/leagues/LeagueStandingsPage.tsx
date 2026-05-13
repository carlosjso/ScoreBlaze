import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { CalendarDays, Shield, UsersRound } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { buildLiveLeagueStandings } from "@/features/leagues/realtime/leagueStandingsRealtime";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, PageHeader, Panel } from "@/shared/components/ui";

export default function LeagueStandingsPage() {
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
  const standingsSnapshot = useMemo(
    () => (stats ? buildLiveLeagueStandings(stats.standings, liveMatchesSnapshot.matches) : null),
    [liveMatchesSnapshot.matches, stats],
  );
  const standingsRows = standingsSnapshot?.rows ?? [];
  const hasLiveStandings = (standingsSnapshot?.liveMatchCount ?? 0) > 0;
  const panelError =
    (detailQuery.error instanceof Error ? detailQuery.error.message : null)
    ?? (statsQuery.error instanceof Error ? statsQuery.error.message : null);

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1320px]">
        <PageHeader
          title="Tabla de posiciones"
          subtitle="Consulta el rendimiento actual de la liga con puntos, diferencia y resultados."
          actions={
            <div className="flex flex-wrap gap-2">
              {league ? (
                <Button variant="outline" onClick={() => navigate(`/leagues/${league.id}`)}>
                  Dashboard
                </Button>
              ) : null}
              <Button variant="ghost" onClick={() => navigate("/leagues")}>
                Ligas
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
              <section className="mb-4 rounded-[28px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Competencia activa</p>
                    <h2 className="mt-2 text-[30px] leading-none text-slate-950 sm:text-[34px]">{league.name}</h2>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <UsersRound size={14} />
                      {stats?.overview.teamsCount ?? league.teamCount} equipos
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <CalendarDays size={14} />
                      {stats?.overview.totalMatches ?? 0} partidos
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                      <Shield size={14} />
                      {league.category}
                    </span>
                    <StatusBadge status={league.status} />
                  </div>
                </div>
              </section>

              {hasLiveStandings ? (
                <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  Tabla provisional en vivo: {standingsSnapshot?.liveMatchCount} {standingsSnapshot?.liveMatchCount === 1 ? "partido impactando posiciones" : "partidos impactando posiciones"}.
                </div>
              ) : null}

              {standingsRows.length > 0 ? (
                <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <div className="min-w-[860px]">
                      <div className="grid grid-cols-[56px_minmax(220px,1.4fr)_72px_72px_72px_72px_96px_96px_96px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <span>Pos</span>
                        <span>Equipo</span>
                        <span className="text-center">PJ</span>
                        <span className="text-center">G</span>
                        <span className="text-center">P</span>
                        <span className="text-center">DIF</span>
                        <span className="text-center">PF</span>
                        <span className="text-center">PC</span>
                        <span className="text-center">PTS</span>
                      </div>

                      {standingsRows.map((row) => (
                        <div
                          key={row.teamId}
                          className="grid grid-cols-[56px_minmax(220px,1.4fr)_72px_72px_72px_72px_96px_96px_96px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
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
                          <span className="text-center text-slate-600">{row.wins}</span>
                          <span className="text-center text-slate-600">{row.losses}</span>
                          <span className="text-center text-slate-600">{row.pointsDifference}</span>
                          <span className="text-center text-slate-600">{row.pointsFor}</span>
                          <span className="text-center text-slate-600">{row.pointsAgainst}</span>
                          <span className="text-center font-semibold text-slate-900">{row.standingsPoints}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <TableEmptyState
                  mode="empty"
                  title="Todavia no hay tabla disponible"
                  description="La tabla de posiciones se llenara conforme se registren resultados en los partidos de esta liga."
                />
              )}
            </>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
