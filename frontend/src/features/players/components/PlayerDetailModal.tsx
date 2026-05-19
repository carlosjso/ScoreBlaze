import {
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { usePlayerHistoricalStats } from "@/features/players/hooks/usePlayerHistoricalStats";
import { buildLeaguePlayerStats, formatPlayerStatsDateLabel } from "@/features/players/playerDetailStats";
import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import type { PlayerDetailStats, PlayerListItem } from "@/features/players/Players.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { Button, Modal } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type PlayerLeagueParticipationProps = {
  leagueName: string;
  teamName: string;
  playerMatchesPlayed: number;
  teamMatchesPlayed: number;
  participationRate: number | null;
  rankingPosition: number | null;
  totalPoints: number;
  made1pt: number;
  made2pt: number;
  made3pt: number;
  missedShots: number;
  totalAssists: number;
  totalRebounds: number;
  totalFouls: number;
  trackedStats?: string[];
  loading?: boolean;
  error?: string | null;
};

type PlayerDetailModalProps = {
  player: PlayerListItem | null;
  isOpen: boolean;
  onClose: () => void;
  leagueParticipation?: PlayerLeagueParticipationProps | null;
};

function formatParticipationRate(value: number | null) {
  if (value === null) {
    return "-";
  }

  return `${value.toLocaleString("es-MX", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDecimal(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("es-MX", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function PlayerStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "accent" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border px-4 py-3 shadow-sm",
        tone === "default" && "border-slate-200 bg-white",
        tone === "accent" && "border-orange-200 bg-orange-50/70",
        tone === "success" && "border-emerald-200 bg-emerald-50/80",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/60 bg-white/80 px-3 py-3 text-center shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-950">{value}</p>
    </div>
  );
}

function DetailPanelRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
        {icon}
        <span className="min-w-0 truncate">{value}</span>
      </p>
    </div>
  );
}

function PlayerStatsSlide({
  stats,
  loading,
  error,
}: {
  stats: PlayerDetailStats | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Cargando estadisticas del jugador...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        Este jugador aun no tiene estadisticas disponibles para este contexto.
      </div>
    );
  }

  const summaryCards =
    stats.scope === "league"
      ? [
          { label: "Partidos", value: String(stats.matchesPlayed), tone: "default" as const },
          { label: "Participacion", value: formatParticipationRate(stats.participationRate), tone: "accent" as const },
          { label: "Puntos", value: String(stats.totalPoints), tone: "default" as const },
          {
            label: "Ranking anotador",
            value: stats.rankingPosition === null ? "-" : `#${stats.rankingPosition}`,
            tone: "success" as const,
          },
        ]
      : [
          { label: "Partidos", value: String(stats.matchesPlayed), tone: "default" as const },
          { label: "Puntos", value: String(stats.totalPoints), tone: "accent" as const },
          { label: "Asistencias", value: String(stats.totalAssists), tone: "default" as const },
          { label: "Rebotes", value: String(stats.totalRebounds), tone: "success" as const },
        ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <PlayerStatCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-orange-600" />
            <p className="text-sm font-semibold text-slate-900">
              {stats.scope === "league" ? "Aporte en la liga" : "Produccion historica"}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <PlayerStatCard label="Tiro libre" value={String(stats.made1pt)} />
            <PlayerStatCard label="Dobles" value={String(stats.made2pt)} />
            <PlayerStatCard label="Triples" value={String(stats.made3pt)} />
            <PlayerStatCard label="Fallos" value={String(stats.missedShots)} />
            <PlayerStatCard label="Faltas" value={String(stats.totalFouls)} />
            <PlayerStatCard label="Puntos totales" value={String(stats.totalPoints)} tone="accent" />
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-slate-600" />
            <p className="text-sm font-semibold text-slate-900">
              {stats.scope === "league" ? "Lectura de competencia" : "Lectura del perfil"}
            </p>
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Promedio por juego</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {formatDecimal(stats.averagePoints)} PTS / {formatDecimal(stats.averageAssists)} AST / {formatDecimal(stats.averageRebounds)} REB
              </p>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tiro registrado</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {stats.totalMadeShots === null || stats.totalShotAttempts === null
                  ? "No disponible para este contexto"
                  : `${stats.totalMadeShots} convertidos / ${stats.totalShotAttempts} intentos`}
              </p>
            </div>

            <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Efectividad</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {stats.shootingAccuracy === null ? "-" : `${formatDecimal(stats.shootingAccuracy)}%`}
              </p>
            </div>

            {stats.scope === "league" ? (
              <>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Competencia</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{stats.leagueName}</p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Equipo actual</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{stats.teamName}</p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Partidos del equipo</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {stats.matchesPlayed} de {stats.teamMatchesPlayed}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Equipos actuales</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{stats.teamsCount}</p>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Ultima actualizacion</p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CalendarDays size={14} />
                    {stats.updatedAt ? formatPlayerStatsDateLabel(stats.updatedAt) : "Sin historial"}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export function PlayerDetailModal({
  player,
  isOpen,
  onClose,
  leagueParticipation = null,
}: PlayerDetailModalProps) {
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
  const historicalStatsQuery = usePlayerHistoricalStats(leagueParticipation ? null : player);

  useEffect(() => {
    setActiveSlide(0);
  }, [player?.id, isOpen]);

  const stats = useMemo(() => {
    if (leagueParticipation) {
      return buildLeaguePlayerStats({
        leagueName: leagueParticipation.leagueName,
        teamName: leagueParticipation.teamName,
        matchesPlayed: leagueParticipation.playerMatchesPlayed,
        teamMatchesPlayed: leagueParticipation.teamMatchesPlayed,
        participationRate: leagueParticipation.participationRate,
        rankingPosition: leagueParticipation.rankingPosition,
        totalPoints: leagueParticipation.totalPoints,
        made1pt: leagueParticipation.made1pt,
        made2pt: leagueParticipation.made2pt,
        made3pt: leagueParticipation.made3pt,
        missedShots: leagueParticipation.missedShots,
        totalAssists: leagueParticipation.totalAssists,
        totalRebounds: leagueParticipation.totalRebounds,
        totalFouls: leagueParticipation.totalFouls,
        trackedStats: leagueParticipation.trackedStats,
      });
    }

    return historicalStatsQuery.data;
  }, [historicalStatsQuery.data, leagueParticipation]);

  const statsLoading = leagueParticipation ? Boolean(leagueParticipation.loading) : historicalStatsQuery.loading;
  const statsError = leagueParticipation ? leagueParticipation.error ?? null : historicalStatsQuery.error;
  const statsSlideTitle = leagueParticipation ? "Estadisticas en liga" : "Historico del jugador";
  const highlightTags = player
    ? [
        player.favoritePosition ? { key: "favoritePosition", label: player.favoritePosition } : null,
        player.nationality ? { key: "nationality", label: player.nationality } : null,
        leagueParticipation ? { key: "team", label: leagueParticipation.teamName } : null,
        { key: "status", label: player.status },
      ].filter((tag): tag is { key: string; label: string } => Boolean(tag))
    : [];

  const goPrev = () => setActiveSlide((current) => (current === 0 ? 1 : 0));
  const goNext = () => setActiveSlide((current) => (current === 1 ? 0 : 1));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Jugador" maxWidthClassName="max-w-4xl">
      {player ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 px-1 py-1">
            <Button variant="ghost" onClick={goPrev} className="rounded-full px-3 py-2">
              <ChevronLeft size={16} />
            </Button>

            <div className="min-w-0 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {activeSlide === 0 ? "Perfil del jugador" : statsSlideTitle}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full transition", activeSlide === 0 ? "bg-orange-500" : "bg-slate-300")} />
                <span className={cn("h-2.5 w-2.5 rounded-full transition", activeSlide === 1 ? "bg-orange-500" : "bg-slate-300")} />
              </div>
            </div>

            <Button variant="ghost" onClick={goNext} className="rounded-full px-3 py-2">
              <ChevronRight size={16} />
            </Button>
          </div>

          {activeSlide === 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
                <section className="rounded-[28px] border border-orange-200 bg-[linear-gradient(180deg,#fff9f2_0%,#ffffff_38%,#f8fafc_100%)] p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">
                    {leagueParticipation ? "Perfil competitivo" : "Ficha general"}
                  </p>

                  <PlayerPhoto
                    name={player.name}
                    photoBase64={player.photoBase64}
                    className="mx-auto mt-4 h-32 w-32 rounded-[30px] text-xl"
                    emptyClassName="border-slate-200 bg-white text-slate-700"
                  />

                  <div className="mt-5 text-center">
                    <p className="text-[28px] font-black leading-none text-slate-950">{player.name}</p>
                    <p className="mt-2 text-sm font-medium text-slate-500">
                      {player.favoritePosition || "Perfil basico del jugador"}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {highlightTags.map((tag) => (
                      <span
                        key={tag.key}
                        className="rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold text-orange-700"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <ProfileMetric label="Edad" value={player.age === null ? "-" : `${player.age}`} />
                    <ProfileMetric label="Estatura" value={player.heightCm === null ? "-" : `${player.heightCm} cm`} />
                    <ProfileMetric label="Peso" value={player.weightKg === null ? "-" : `${player.weightKg} kg`} />
                    <ProfileMetric
                      label="Equipos"
                      value={`${player.teamsCount} ${player.teamsCount === 1 ? "equipo" : "equipos"}`}
                    />
                  </div>
                </section>

                <div className="space-y-4">
                  {leagueParticipation ? (
                    <section className="rounded-[24px] border border-orange-200 bg-[linear-gradient(135deg,#fffaf5_0%,#ffffff_62%,#fff7ed_100%)] p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600">
                            Contexto de liga
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{leagueParticipation.leagueName}</p>
                        </div>

                        <span className="rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700">
                          {leagueParticipation.teamName}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <DetailPanelRow label="Partidos jugados" value={`${leagueParticipation.playerMatchesPlayed} de ${leagueParticipation.teamMatchesPlayed}`} />
                        <DetailPanelRow label="Participacion" value={formatParticipationRate(leagueParticipation.participationRate)} />
                        <DetailPanelRow
                          label="Ranking anotador"
                          value={leagueParticipation.rankingPosition === null ? "-" : `#${leagueParticipation.rankingPosition}`}
                        />
                      </div>
                    </section>
                  ) : null}

                  <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4">
                      <p className="text-sm font-semibold text-slate-900">Datos registrados</p>
                      <p className="text-xs text-slate-500">Solo se muestran campos reales del jugador dentro de la plataforma.</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailPanelRow label="Correo" value={player.email} icon={<Mail size={14} />} />
                      <DetailPanelRow label="Telefono" value={player.phone || "Sin telefono"} icon={<Phone size={14} />} />
                      <DetailPanelRow label="Estatus" value={player.status} icon={<Shield size={14} />} />
                      <DetailPanelRow
                        label="Nacionalidad"
                        value={player.nationality || "Sin registrar"}
                        icon={<UsersRound size={14} />}
                      />
                    </div>
                  </section>

                  <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">Equipos actuales</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {player.teamsCount} {player.teamsCount === 1 ? "asignado" : "asignados"}
                      </p>
                    </div>

                    {player.teams.length > 0 ? (
                      <div className="grid max-h-[260px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {player.teams.map((team) => (
                          <div
                            key={`${player.id}-${team.id}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
                          >
                            <TeamLogo
                              name={team.name}
                              logoBase64={team.logoBase64}
                              seed={team.id}
                              className="h-10 w-10 shrink-0 rounded-xl text-xs"
                              imageClassName="p-1.5"
                              emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
                            />

                            <span className="min-w-0">
                              <span className="block truncate text-sm font-semibold text-slate-800" title={team.name}>
                                {team.name}
                              </span>
                              <span className="block text-xs text-slate-500">Equipo asignado</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Sin equipo asignado.</p>
                    )}
                  </section>
                </div>
              </div>
            </div>
          ) : (
            <PlayerStatsSlide stats={stats} loading={statsLoading} error={statsError} />
          )}
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  );
}
