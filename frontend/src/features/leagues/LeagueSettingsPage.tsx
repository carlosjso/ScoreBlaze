import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, Mail, Pencil, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueFormModal } from "@/features/leagues/components/LeagueFormModal";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { Button, PageHeader, Panel } from "@/shared/components/ui";

const finalPhasePresetLabels = {
  TOP_4_SINGLE_GAME: "Top 4 - Partido unico",
  TOP_8_SINGLE_GAME: "Top 8 - Partido unico",
  TOP_8_HOME_AWAY: "Top 8 - Ida y vuelta",
  TOP_6_SINGLE_GAME_WITH_BYES: "Top 6 - Bye 1ro y 2do",
  TOP_16_SINGLE_GAME: "Top 16 - Partido unico",
  TOP_32_SINGLE_GAME: "Top 32 - Partido unico",
  NBA_PLAY_IN_TOP_10: "NBA - Play-In (10 equipos)",
  DOUBLE_ELIMINATION_TOP_8: "Doble eliminacion - Top 8",
  DOUBLE_ELIMINATION_TOP_16: "Doble eliminacion - Top 16",
  CUSTOM: "Personalizado",
} as const;

export default function LeagueSettingsPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const selectedLeagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(selectedLeagueId) && selectedLeagueId > 0;
  const [formOpen, setFormOpen] = useState(false);

  const leagueQuery = useQuery({
    queryKey: leaguesQueryKeys.detail(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeague(selectedLeagueId, signal),
    enabled: hasValidLeagueId,
  });

  const teamsQuery = useQuery({
    queryKey: teamsQueryKeys.catalog(),
    queryFn: ({ signal }) => teamsService.getCatalog(signal),
  });

  const {
    submitting,
    mutationError,
    mutationErrorMessage,
    clearMutationError,
    saveLeague,
  } = useLeaguesMutations();

  const league = leagueQuery.data ?? null;
  const loading = leagueQuery.isPending;
  const panelError = mutationErrorMessage ?? (leagueQuery.error instanceof Error ? leagueQuery.error.message : null);

  const handleSubmit = async (values: Parameters<typeof saveLeague>[0]["values"]) => {
    if (!league) {
      return;
    }

    const savedLeague = await saveLeague({
      mode: "edit",
      leagueId: league.id,
      values,
    });

    clearMutationError();
    setFormOpen(false);
    return savedLeague;
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1220px]">
        <PageHeader
          title="Ajustes de liga"
          subtitle="Edita la configuracion principal de esta liga sin regresar al listado."
          actions={<LeagueSectionNav league={league} />}
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
              <section className="rounded-[28px] border border-slate-300 bg-[linear-gradient(135deg,#fff9f3_0%,#ffffff_65%,#f8fafc_100%)] p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-700">
                        <LayoutGrid size={12} />
                        Liga #{league.id}
                      </span>
                      <StatusBadge status={league.status} />
                    </div>

                    <h2 className="mt-3 max-w-full truncate text-[30px] leading-none text-slate-950 sm:text-[34px]" title={league.name}>
                      {league.name}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Ajusta los datos administrativos, calendario base y metricas que se monitorean en esta liga.
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    onClick={() => {
                      clearMutationError();
                      setFormOpen(true);
                    }}
                  >
                    <Pencil size={16} />
                    Editar liga
                  </Button>
                </div>
              </section>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Configuracion actual</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Categoria</p>
                      <p className="mt-2 font-semibold text-slate-900 [overflow-wrap:anywhere]">{league.category}</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Equipos</p>
                      <p className="mt-2 inline-flex items-center gap-2 font-semibold text-slate-900">
                        <UsersRound size={14} />
                        {league.teamCount}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Responsable</p>
                      <p className="mt-2 font-semibold text-slate-900">{league.responsibleName}</p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Correo</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Mail size={14} />
                        {league.responsibleEmail}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Fase final</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Trophy size={14} />
                        {league.finalPhaseEnabled
                          ? `${finalPhasePresetLabels[league.finalPhasePreset]} - Top ${league.finalPhaseQualifiedTeams}`
                          : "Desactivada"}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Calendario y metricas</p>
                  <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Fechas</p>
                    <p className="mt-2 inline-flex items-center gap-2 font-semibold text-slate-900">
                      <CalendarDays size={14} />
                      {league.startDate} - {league.endDate}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {league.trackedStats.map((stat) => (
                      <span key={stat} className="rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                        {stat}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            </>
          ) : null}
        </Panel>
      </div>

      <LeagueFormModal
        isOpen={formOpen}
        mode="edit"
        competitionType={league?.competitionType ?? "LEAGUE"}
        initialLeague={league}
        teams={teamsQuery.data ?? []}
        loading={submitting}
        apiError={mutationError}
        advancedSettingsHref={league ? `/leagues/${league.id}/final-phase/settings` : undefined}
        onClose={() => {
          clearMutationError();
          setFormOpen(false);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

