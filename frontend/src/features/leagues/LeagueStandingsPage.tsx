import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Folder, Settings2, Shield, Trophy, UsersRound } from "lucide-react";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { getCompetitionCapabilities } from "@/features/leagues/competitionCapabilities";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { buildLiveLeagueStandings } from "@/features/leagues/realtime/leagueStandingsRealtime";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { Button, PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";
import type { LeagueStandingRow } from "@/features/leagues/Leagues.types";

type DisplayStandingRow = LeagueStandingRow & { isLive?: boolean; liveSummary?: string | null };

function StandingsTable({ rows, qualifiers = 0, compact = false }: { rows: DisplayStandingRow[]; qualifiers?: number; compact?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <div className={compact ? "min-w-[680px]" : "min-w-[860px]"}>
        <div className="grid grid-cols-[52px_minmax(180px,1.4fr)_58px_58px_72px_72px_72px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Pos</span><span>Equipo</span><span className="text-center">PJ</span><span className="text-center">G</span><span className="text-center">DIF</span><span className="text-center">PF</span><span className="text-center">PC</span>
        </div>
        {rows.map((row) => {
          const qualifies = qualifiers > 0 && row.position <= qualifiers;
          return (
            <div key={row.teamId} className="grid grid-cols-[52px_minmax(180px,1.4fr)_58px_58px_72px_72px_72px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
              <span className="flex items-center gap-2 font-semibold text-slate-500">
                <span className={qualifies ? "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-50 text-orange-700" : "inline-flex h-7 w-7 items-center justify-center"}>{row.position}</span>
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 truncate font-semibold text-slate-900" title={row.teamName}>
                  {qualifies ? <Trophy size={13} className="shrink-0 text-orange-500" /> : null}{row.teamName}
                </span>
                {row.isLive && row.liveSummary ? <span className="mt-1 block truncate text-xs font-medium text-orange-600">{row.liveSummary}</span> : null}
              </span>
              <span className="text-center text-slate-600">{row.matchesPlayed}</span>
              <span className="text-center text-slate-600">{row.wins}</span>
              <span className="text-center text-slate-600">{row.pointsDifference}</span>
              <span className="text-center text-slate-600">{row.pointsFor}</span>
              <span className="text-center font-semibold text-slate-900">{row.pointsAgainst}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
    () => (stats ? buildLiveLeagueStandings(stats.standings, league?.bracketGenerated ? [] : liveMatchesSnapshot.matches, league?.standingsTiebreakers) : null),
    [league?.bracketGenerated, league?.standingsTiebreakers, liveMatchesSnapshot.matches, stats],
  );
  const standingsRows = standingsSnapshot?.rows ?? [];
  const groupStandings = useMemo(
    () => (stats?.groupStandings ?? []).map((group) => ({
      ...group,
      snapshot: buildLiveLeagueStandings(
        group.standings,
        league?.bracketGenerated
          ? []
          : liveMatchesSnapshot.matches.filter((match) => (
              match.competitionStage === "GROUP_STAGE"
              && match.groupStageGroupKey === group.groupKey
              && group.teamIds.includes(match.teamAId)
              && group.teamIds.includes(match.teamBId)
            )),
        league?.standingsTiebreakers,
      ),
    })),
    [league?.bracketGenerated, league?.standingsTiebreakers, liveMatchesSnapshot.matches, stats?.groupStandings],
  );
  const [activeGroupKey, setActiveGroupKey] = useState("");
  const activeGroup = groupStandings.find((group) => group.groupKey === activeGroupKey) ?? groupStandings[0] ?? null;
  const liveStandingsCount = league?.competitionType === "GROUPS"
    ? groupStandings.reduce((total, group) => total + group.snapshot.liveMatchCount, 0)
    : standingsSnapshot?.liveMatchCount ?? 0;
  const hasLiveStandings = liveStandingsCount > 0;
  const capabilities = league ? getCompetitionCapabilities(league) : null;
  const panelError =
    (detailQuery.error instanceof Error ? detailQuery.error.message : null)
    ?? (statsQuery.error instanceof Error ? statsQuery.error.message : null);

  useEffect(() => {
    if (groupStandings.length === 0) {
      setActiveGroupKey("");
      return;
    }
    if (!groupStandings.some((group) => group.groupKey === activeGroupKey)) {
      setActiveGroupKey(groupStandings[0].groupKey);
    }
  }, [activeGroupKey, groupStandings]);

  if (league?.competitionType === "GROUPS") {
    return <Navigate to={`/leagues/${league.id}/groups`} replace />;
  }

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1320px]">
        <PageHeader
          title="Tabla de posiciones"
          subtitle="Consulta el rendimiento actual de la liga con puntos, diferencia y resultados."
          actions={<LeagueSectionNav league={league} active="standings" />}
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

          {league && capabilities && !capabilities.showStandings ? (
            <TableEmptyState
              mode="filtered"
              title="Esta competencia no usa tabla de posiciones"
              description={`${capabilities.label} se gestiona por bracket o formato eliminatorio, asi que la vista principal debe ser partidos, equipos y llaves.`}
              actionLabel="Volver al dashboard"
              onAction={() => navigate(`/leagues/${league.id}`)}
            />
          ) : null}

          {league && capabilities?.showStandings ? (
            <>
              <section className="mb-4 rounded-[28px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Competencia activa</p>
                    <h2 className="mt-2 max-w-full truncate text-[30px] leading-none text-slate-950 sm:text-[34px]" title={league.name}>
                      {league.name}
                    </h2>
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
                    <span
                      className="inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                      title={league.category}
                    >
                      <Shield size={14} className="shrink-0" />
                      <span className="min-w-0 truncate">{league.category}</span>
                    </span>
                    <StatusBadge status={league.status} />
                  </div>
                </div>
              </section>

              {hasLiveStandings ? (
                <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  Posiciones provisionales en vivo: {liveStandingsCount} {liveStandingsCount === 1 ? "partido impactando posiciones" : "partidos impactando posiciones"}.
                </div>
              ) : null}

              {league.bracketGenerated && league.competitionType === "LEAGUE" ? (
                <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <strong>Tabla oficial congelada.</strong> Estas posiciones definieron el Top {league.finalPhaseQualifiedTeams} que avanzo a playoffs.
                </div>
              ) : null}

              {capabilities.showGroups && groupStandings.length > 0 ? (
                <section className="overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm">
                  <div className="overflow-x-auto border-b border-slate-200 bg-slate-100/80 px-4 pt-4">
                    <div className="flex min-w-max items-end gap-2">
                      {groupStandings.map((group) => {
                        const active = activeGroup?.groupKey === group.groupKey;
                        return (
                          <button
                            key={group.groupKey}
                            type="button"
                            onClick={() => setActiveGroupKey(group.groupKey)}
                            className={cn(
                              "relative flex min-w-[170px] items-center gap-3 rounded-t-[18px] border border-b-0 px-4 py-3 text-left transition",
                              active
                                ? "-mb-px border-orange-300 bg-white text-slate-950 shadow-[0_-8px_20px_rgba(249,115,22,0.08)]"
                                : "border-slate-200 bg-slate-50 text-slate-500 hover:border-sky-200 hover:bg-white",
                            )}
                          >
                            <Folder size={18} className={active ? "fill-orange-100 text-orange-600" : "text-slate-400"} />
                            <span className="min-w-0">
                              <span className="block text-[9px] font-bold uppercase tracking-[0.14em]">Grupo {group.groupKey}</span>
                              <span className="mt-0.5 block max-w-[120px] truncate text-sm font-bold">{group.groupName}</span>
                            </span>
                            {active ? <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-orange-500" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {activeGroup ? (
                    <div>
                      <div className="flex flex-col gap-3 border-b border-sky-100 bg-[linear-gradient(110deg,#eff9ff_0%,#ffffff_62%,#fff7ed_100%)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700">Carpeta activa - Grupo {activeGroup.groupKey}</p>
                          <h3 className="mt-1 text-xl font-bold text-slate-950">{activeGroup.groupName}</h3>
                          <p className="mt-1 text-xs text-slate-500">{activeGroup.teamIds.length} equipos - {activeGroup.matchCount} partidos registrados</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700">
                            {league.groupStageConfig?.qualifiersPerGroup ?? 0} clasifican
                          </span>
                          <Button variant="outline" size="sm" onClick={() => navigate(`/leagues/${league.id}/groups`)}>
                            <Settings2 size={14} /> Grupos
                          </Button>
                        </div>
                      </div>
                      <StandingsTable rows={activeGroup.snapshot.rows} qualifiers={league.groupStageConfig?.qualifiersPerGroup ?? 0} />
                    </div>
                  ) : null}
                </section>
              ) : capabilities.showGroups ? (
                <TableEmptyState mode="empty" title="Todavia no hay grupos configurados" description="Primero distribuye los equipos para crear una carpeta de posiciones por grupo." actionLabel="Abrir grupos" onAction={() => navigate(`/leagues/${league.id}/groups`)} />
              ) : standingsRows.length > 0 ? (
                <div className="overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm"><StandingsTable rows={standingsRows} /></div>
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
