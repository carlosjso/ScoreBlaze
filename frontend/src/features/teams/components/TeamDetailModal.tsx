import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleUserRound, Hash, Mail, Phone, Trophy, UsersRound } from "lucide-react";
import { useEffect, useState } from "react";

import { PlayerPhoto } from "@/features/players/components/PlayerPhoto";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import type { TeamDetailStats, TeamListItem } from "@/features/teams/Teams.types";
import { Button, Input, Modal } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type TeamDetailModalProps = {
  team: TeamListItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPlayerClick?: (playerId: number) => void;
  stats?: TeamDetailStats | null;
  statsLoading?: boolean;
  statsError?: string | null;
};

function StatsCard({
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

function formatDecimal(value: number | null) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("es-MX", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function TeamDetailModal({
  team,
  isOpen,
  onClose,
  onPlayerClick,
  stats,
  statsLoading = false,
  statsError = null,
}: TeamDetailModalProps) {
  const showStatsSlide = stats !== undefined || statsLoading || statsError !== null;
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
  const statsSlideTitle = stats?.scope === "league" ? "Resumen en liga" : "Resumen historico";
  const balanceTitle = stats?.scope === "league" ? "Balance en la liga" : "Balance historico";
  const metricsTitle = stats?.scope === "league" ? "Actividad en la liga" : "Metricas generales";

  useEffect(() => {
    setActiveSlide(0);
  }, [team?.id, isOpen]);

  const goPrev = () => {
    if (!showStatsSlide) {
      return;
    }

    setActiveSlide((current) => (current === 0 ? 1 : 0));
  };

  const goNext = () => {
    if (!showStatsSlide) {
      return;
    }

    setActiveSlide((current) => (current === 1 ? 0 : 1));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Equipo" maxWidthClassName="max-w-2xl">
      {team ? (
        <div className="space-y-4">
          {showStatsSlide ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Button variant="ghost" onClick={goPrev} className="rounded-full px-3 py-2">
                <ChevronLeft size={16} />
              </Button>

              <div className="min-w-0 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {activeSlide === 0 ? "Ficha del equipo" : statsSlideTitle}
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
          ) : null}

          {activeSlide === 0 || !showStatsSlide ? (
            <div className="space-y-4">
              <TeamLogo
                name={team.name}
                logoBase64={team.logoBase64}
                seed={team.id}
                className="mx-auto h-20 w-20 rounded-2xl text-base"
                imageClassName="p-2"
                emptyClassName="text-slate-600"
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Input label="Nombre" value={team.name} disabled leftIcon={<CircleUserRound size={14} />} />
                <Input label="ID" value={String(team.id)} disabled leftIcon={<Hash size={14} />} />
                <Input
                  label="Responsable"
                  value={team.responsibleName || "Sin responsable"}
                  disabled
                  leftIcon={<CircleUserRound size={14} />}
                />
                <Input
                  label="Telefono"
                  value={team.responsiblePhone || "Sin telefono"}
                  disabled
                  leftIcon={<Phone size={14} />}
                />
                <Input
                  label="Correo"
                  value={team.responsibleEmail || "Sin correo"}
                  disabled
                  leftIcon={<Mail size={14} />}
                />
                <Input
                  label="Plantilla"
                  value={`${team.playerCount} ${team.playerCount === 1 ? "jugador" : "jugadores"}`}
                  disabled
                  leftIcon={<UsersRound size={14} />}
                />
                <Input label="Estado" value={team.rosterStatus} disabled leftIcon={<Hash size={14} />} />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold text-slate-600">Jugadores</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {team.playerCount} {team.playerCount === 1 ? "registrado" : "registrados"}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {team.players.length > 0 ? (
                    <div className="grid max-h-[320px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                      {team.players.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => onPlayerClick?.(player.id)}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-sm"
                        >
                          <PlayerPhoto
                            name={player.name}
                            photoBase64={player.photoBase64}
                            className="h-10 w-10 shrink-0 rounded-xl text-xs font-black"
                            imageClassName="object-cover"
                            emptyClassName="border-slate-200 bg-slate-100 text-slate-800"
                          />

                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-slate-800">
                              {player.name}
                            </span>
                            <span
                              className="block truncate text-xs text-slate-500"
                              title={player.email}
                            >
                              <Mail size={12} className="mr-1 inline" />
                              {player.email}
                            </span>
                            {onPlayerClick ? (
                              <span className="mt-1 block text-[11px] font-semibold text-orange-600">
                                Ver jugador
                              </span>
                            ) : null}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Este equipo todavia no tiene jugadores asignados.</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {showStatsSlide && activeSlide === 1 ? (
            <div className="space-y-4">
              {statsLoading ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Cargando estadisticas del equipo...
                </div>
              ) : statsError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                  {statsError}
                </div>
              ) : stats ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <StatsCard label="Partidos" value={String(stats.matchesPlayed)} />
                    {stats.scope === "league" ? (
                      <>
                        <StatsCard
                          label="Posicion actual"
                          value={stats.leaguePosition === null ? "-" : `#${stats.leaguePosition}`}
                          tone="accent"
                        />
                        <StatsCard label="Puntos de tabla" value={String(stats.standingsPoints)} tone="success" />
                        <StatsCard
                          label="% victorias"
                          value={stats.winRate === null ? "-" : `${formatDecimal(stats.winRate)}%`}
                        />
                      </>
                    ) : (
                      <>
                        <StatsCard
                          label="% victorias"
                          value={stats.winRate === null ? "-" : `${formatDecimal(stats.winRate)}%`}
                          tone="accent"
                        />
                        <StatsCard label="Puntos a favor" value={String(stats.pointsFor)} />
                        <StatsCard label="Puntos en contra" value={String(stats.pointsAgainst)} />
                      </>
                    )}
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <Trophy size={16} className="text-orange-600" />
                        <p className="text-sm font-semibold text-slate-900">{balanceTitle}</p>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <StatsCard label="Victorias" value={String(stats.wins)} tone="success" />
                        <StatsCard label="Derrotas" value={String(stats.losses)} />
                        <StatsCard label="Empates" value={String(stats.draws)} />
                        <StatsCard
                          label="Diferencia"
                          value={stats.pointsDifference >= 0 ? `+${stats.pointsDifference}` : String(stats.pointsDifference)}
                        />
                        {stats.scope === "league" ? (
                          <>
                            <StatsCard label="Puntos a favor" value={String(stats.pointsFor)} />
                            <StatsCard label="Puntos en contra" value={String(stats.pointsAgainst)} />
                          </>
                        ) : (
                          <>
                            <StatsCard label="Partidos rapidos" value={String(stats.quickMatchesCount)} tone="accent" />
                            <StatsCard label="Partidos de liga" value={String(stats.leagueMatchesCount)} />
                          </>
                        )}
                      </div>
                    </section>

                    <section className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-slate-600" />
                        <p className="text-sm font-semibold text-slate-900">{metricsTitle}</p>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Promedio por juego</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {formatDecimal(stats.averagePointsFor)} PF / {formatDecimal(stats.averagePointsAgainst)} PC
                          </p>
                        </div>
                        {stats.scope === "league" ? (
                          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Competencia</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">{stats.leagueName}</p>
                          </div>
                        ) : (
                          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tipo de partidos</p>
                            <p className="mt-2 text-sm font-semibold text-slate-900">
                              {stats.quickMatchesCount} rapidos / {stats.leagueMatchesCount} de liga
                            </p>
                          </div>
                        )}
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Actividad actual</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {stats.liveMatchesCount} en juego / {stats.scheduledMatchesCount} programados
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Faltas de equipo</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900">
                            {stats.totalTeamFouls === null ? "-" : String(stats.totalTeamFouls)}
                          </p>
                        </div>
                        <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Ultimo partido</p>
                          <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <CalendarDays size={14} />
                            {stats.lastMatchDate ?? "Sin historial"}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  Este equipo todavia no tiene estadisticas disponibles para este contexto.
                </div>
              )}
            </div>
          ) : null}
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
