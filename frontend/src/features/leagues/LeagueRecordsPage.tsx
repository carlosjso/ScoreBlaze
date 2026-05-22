import { ChevronRight, Medal, Trophy, UsersRound } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { buildLeagueLeaderPreviewItems } from "@/features/leagues/leagueLeaders";
import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import { playersQueryKeys, playersService } from "@/features/players/Players.service";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { useQuery } from "@tanstack/react-query";
import { PageHeader, Panel } from "@/shared/components/ui";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { cn } from "@/shared/utils/cn";

type RecordsCardProps = ReturnType<typeof buildLeagueLeaderPreviewItems>[number] & {
  teamLogoBase64?: string | null;
  playerPhotoBase64?: string | null;
};

function RecordsCard({
  label,
  title,
  subtitle,
  valueLabel,
  category,
  teamId,
  teamLogoBase64,
  playerPhotoBase64,
}: RecordsCardProps) {
  const isPlayer = category === "player";
  const detailLabel = isPlayer
    ? subtitle ?? "Sin equipo asignado"
    : subtitle === "Tabla general"
      ? "Lider de la competencia"
      : "Record dentro de la liga";
  const accentTextClass = isPlayer ? "text-orange-600" : "text-slate-700";
  const accentBorderClass = isPlayer ? "border-orange-200" : "border-slate-200";
  const accentSoftClass = isPlayer ? "bg-orange-50/55" : "bg-slate-50/85";
  const sheenClass = isPlayer
    ? "bg-[linear-gradient(90deg,transparent_0%,rgba(255,247,237,0.18)_20%,rgba(255,255,255,0.9)_50%,rgba(253,186,116,0.34)_72%,transparent_100%)]"
    : "bg-[linear-gradient(90deg,transparent_0%,rgba(248,250,252,0.12)_20%,rgba(255,255,255,0.92)_50%,rgba(226,232,240,0.5)_72%,transparent_100%)]";

  return (
    <div className="group relative min-h-[188px]">
      <div
        className={cn(
          "relative z-10 flex min-h-[188px] flex-col overflow-hidden rounded-[22px] border px-3.5 py-3.5 shadow-[0_18px_32px_rgba(15,23,42,0.06)] transition",
          "bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)]",
          isPlayer ? "border-orange-100" : "border-slate-200",
        )}
      >
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-1.5 overflow-hidden",
            isPlayer
              ? "bg-[linear-gradient(90deg,#fdba74_0%,#fb923c_48%,#fed7aa_100%)]"
              : "bg-[linear-gradient(90deg,#94a3b8_0%,#cbd5e1_48%,#e2e8f0_100%)]",
          )}
        >
          <span className={cn("absolute inset-y-0 left-[-28%] w-16 skew-x-[-18deg] opacity-90 motion-safe:animate-[record-shine_3.2s_linear_infinite]", sheenClass)} />
        </div>

        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[10px] font-semibold uppercase tracking-[0.16em]", isPlayer ? "text-orange-500" : "text-slate-400")}>
              {label}
            </p>
          </div>

          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] shadow-sm",
              isPlayer ? "border-orange-100 bg-white text-orange-600" : "border-slate-200 bg-white text-slate-500",
            )}
          >
            {isPlayer ? "Jugador" : "Equipo"}
          </span>
        </div>

        <div className="relative mt-3 flex flex-1 flex-col items-center text-center">
          <div className={cn("flex h-16 w-16 items-center justify-center rounded-[22px] border bg-white shadow-[0_12px_22px_rgba(15,23,42,0.08)]", accentBorderClass)}>
            {isPlayer ? (
              <PlayerPhoto
                name={title}
                photoBase64={playerPhotoBase64 ?? null}
                className="h-12 w-12 border border-slate-100 bg-white"
              />
            ) : (
              <TeamLogo
                name={title}
                logoBase64={teamLogoBase64 ?? null}
                seed={teamId ?? 0}
                className="h-12 w-12 rounded-[16px] bg-white"
                imageClassName="p-1.5"
              />
            )}
          </div>

          <div className="mt-3 min-w-0">
            <p className="line-clamp-2 text-[17px] font-black leading-5 tracking-tight text-slate-950">
              {title}
            </p>
            <p className="mt-1 line-clamp-1 text-[12px] text-slate-500">{detailLabel}</p>
          </div>

          <div className={cn("relative mt-3 w-full overflow-hidden rounded-[16px] border px-3 py-2.5 shadow-sm", accentBorderClass, accentSoftClass)}>
            <span className={cn("pointer-events-none absolute inset-y-0 left-[-30%] w-20 skew-x-[-18deg] opacity-80 motion-safe:animate-[record-shine_3.8s_linear_infinite]", sheenClass)} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Record actual
            </p>
            <p className={cn("mt-1 text-[21px] font-black uppercase leading-none tracking-[0.05em]", accentTextClass)}>
              {valueLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeadersCarouselSection({
  eyebrow,
  title,
  icon,
  items,
  emptyLabel,
  teamLogoById,
  playerPhotoById,
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  items: ReturnType<typeof buildLeagueLeaderPreviewItems>;
  emptyLabel: string;
  teamLogoById: Map<number, string | null>;
  playerPhotoById: Map<number, string | null>;
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_45%,#fffaf5_100%)] p-1 shadow-[0_22px_45px_rgba(15,23,42,0.05)]">
      <div className="absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent_0%,rgba(148,163,184,0.35)_18%,rgba(251,146,60,0.22)_52%,transparent_100%)]" />
      <div className="relative rounded-[28px] border border-white/70 bg-white/92 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-slate-700">{icon}</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{eyebrow}</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-950">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">Consulta rapidamente los records destacados de esta competencia.</p>
          </div>
        </div>

        {items.length > 0 ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm">
            {items.length} visibles
            <ChevronRight size={12} />
          </span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <RecordsCard
                key={item.key}
                label={item.label}
                title={item.title}
                subtitle={item.subtitle}
                valueLabel={item.valueLabel}
                category={item.category}
                teamId={item.teamId}
                playerId={item.playerId}
                teamLogoBase64={item.teamId ? teamLogoById.get(item.teamId) ?? null : null}
                playerPhotoBase64={item.playerId ? playerPhotoById.get(item.playerId) ?? null : null}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
          {emptyLabel}
        </div>
      )}
      </div>
    </section>
  );
}

export default function LeagueRecordsPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;

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

  const playersSnapshotQuery = useQuery({
    queryKey: playersQueryKeys.snapshot(),
    queryFn: ({ signal }) => playersService.getSnapshot(signal),
    enabled: hasValidLeagueId,
    staleTime: 5 * 60 * 1000,
  });

  const league = detailQuery.data ?? null;
  const stats = statsQuery.data ?? null;
  const loading = detailQuery.isPending || statsQuery.isPending;
  const panelError = detailQuery.error instanceof Error ? detailQuery.error.message : null;
  const statsError = statsQuery.error instanceof Error ? statsQuery.error.message : null;
  const leaderItems = useMemo(() => buildLeagueLeaderPreviewItems(stats), [stats]);
  const teamLeaderItems = leaderItems.filter((item) => item.category === "team");
  const playerLeaderItems = leaderItems.filter((item) => item.category === "player");
  const scoringRanking = stats?.playerRankings.slice(0, 10) ?? [];
  const teamLogoById = useMemo(
    () => new Map((league?.teams ?? []).map((team) => [team.id, team.logoBase64] as const)),
    [league?.teams],
  );
  const playerPhotoById = useMemo(
    () =>
      new Map(
        (playersSnapshotQuery.data?.players ?? []).map((player) => [player.id, player.photo_base64] as const),
      ),
    [playersSnapshotQuery.data?.players],
  );

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1320px]">
        <style>
          {`
            @keyframes record-shine {
              0% { transform: translateX(-150%) skewX(-18deg); opacity: 0; }
              10% { opacity: 0.2; }
              45% { opacity: 0.9; }
              70% { opacity: 0.35; }
              100% { transform: translateX(430%) skewX(-18deg); opacity: 0; }
            }
          `}
        </style>
        <PageHeader
          title="Lideres y records"
          subtitle="Consulta el resumen completo de lideres de equipos y jugadores dentro de esta liga."
          actions={<LeagueSectionNav league={league} />}
        />

        <Panel>
          {panelError ? (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {panelError}
            </div>
          ) : null}

          {statsError ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {statsError}
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

          {league && stats ? (
            <div className="space-y-5">
              <section className="relative overflow-hidden rounded-[32px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_52%,#f8fafc_100%)] p-2 shadow-[0_22px_50px_rgba(15,23,42,0.06)]">
                <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-orange-100/40 blur-3xl" />
                <div className="absolute -right-10 bottom-8 h-28 w-28 rounded-full bg-sky-100/50 blur-3xl" />
                <div className="relative rounded-[28px] border border-white/80 bg-white/92 px-5 py-6 backdrop-blur-sm sm:px-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <TeamLogo
                        name={league.name}
                        logoBase64={league.logoBase64}
                        seed={league.id}
                        className="h-20 w-20 shrink-0 rounded-[24px] text-xl shadow-sm"
                        imageClassName="p-2"
                      />

                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-500">Resumen historico</p>
                        <h2 className="mt-2 max-w-full truncate text-[30px] leading-none text-slate-950 sm:text-[34px]" title={league.name}>
                          {league.name}
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                          Aqui ves todos los lideres principales de equipos y jugadores registrados en esta competencia.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
                        <Trophy size={14} />
                        {teamLeaderItems.length} lideres de equipo
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-2 text-sm font-semibold text-orange-600">
                        <UsersRound size={14} />
                        {playerLeaderItems.length} lideres de jugador
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid gap-5">
                <LeadersCarouselSection
                  eyebrow="Equipos"
                  title="Lideres de equipos"
                  icon={<Trophy size={18} />}
                  items={teamLeaderItems}
                  emptyLabel="Aun no hay suficientes resultados para mostrar lideres de equipos."
                  teamLogoById={teamLogoById}
                  playerPhotoById={playerPhotoById}
                />

                <LeadersCarouselSection
                  eyebrow="Jugadores"
                  title="Lideres individuales"
                  icon={<Medal size={18} className="text-orange-600" />}
                  items={playerLeaderItems}
                  emptyLabel="Aun no hay suficientes partidos para mostrar lideres individuales."
                  teamLogoById={teamLogoById}
                  playerPhotoById={playerPhotoById}
                />
              </div>

              <section className="relative overflow-hidden rounded-[30px] border border-slate-300 bg-[linear-gradient(135deg,#f8fafc_0%,#ffffff_62%,#fffaf5_100%)] p-1 shadow-[0_22px_45px_rgba(15,23,42,0.05)]">
                <div className="absolute -left-8 bottom-4 h-24 w-24 rounded-full bg-slate-100/70 blur-3xl" />
                <div className="relative rounded-[28px] border border-white/70 bg-white/92 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Ranking</p>
                    <h3 className="mt-1 text-xl font-semibold text-slate-950">Top anotadores</h3>
                    <p className="mt-1 text-sm text-slate-500">Resumen de produccion ofensiva de los jugadores con mas puntos en la liga.</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                    {scoringRanking.length} visibles
                    <ChevronRight size={12} />
                  </span>
                </div>

                {scoringRanking.length > 0 ? (
                  <div className="mt-4 overflow-hidden rounded-[22px] border border-slate-200">
                    <div className="grid grid-cols-[64px_minmax(0,1fr)_160px_90px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <span>Pos</span>
                      <span>Jugador</span>
                      <span>Equipo</span>
                      <span className="text-right">PTS</span>
                    </div>

                    {scoringRanking.map((row) => (
                      <div
                        key={row.playerId}
                        className={cn(
                          "grid grid-cols-[64px_minmax(0,1fr)_160px_90px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0",
                          row.position === 1 && "bg-orange-50/50",
                          row.position === 2 && "bg-slate-50/80",
                          row.position === 3 && "bg-amber-50/40",
                        )}
                      >
                        <span className="font-semibold text-slate-500">#{row.position}</span>
                        <div className="flex min-w-0 items-center gap-3">
                          <PlayerPhoto
                            name={row.playerName}
                            photoBase64={playerPhotoById.get(row.playerId) ?? null}
                            className="h-10 w-10 shrink-0 border border-slate-200 bg-white shadow-sm"
                          />
                          <span className="truncate font-semibold text-slate-900" title={row.playerName}>
                            {row.playerName}
                          </span>
                        </div>
                        <div className="flex min-w-0 items-center gap-2">
                          {row.teamName ? (
                            <TeamLogo
                              name={row.teamName}
                              logoBase64={row.teamId ? teamLogoById.get(row.teamId) ?? null : null}
                              seed={row.teamId ?? 0}
                              className="h-8 w-8 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm"
                              imageClassName="p-1.5"
                            />
                          ) : null}
                          <span className="truncate text-slate-500" title={row.teamName ?? "Sin equipo"}>
                            {row.teamName ?? "Sin equipo"}
                          </span>
                        </div>
                        <span className="text-right font-semibold text-orange-600">{row.totalPoints}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
                    Todavia no hay suficiente actividad para construir el ranking de anotadores.
                  </div>
                )}
                </div>
              </section>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
