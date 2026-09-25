import { useQuery } from "@tanstack/react-query";
import { CalendarDays, LayoutGrid, Mail, Pencil, Trophy, UsersRound } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { LeagueFormModal } from "@/features/leagues/components/LeagueFormModal";
import { leagueMatchesService } from "@/features/leagues/LeagueMatches.service";
import { summarizeGroupSchedule, summarizeLeagueSchedule } from "@/features/leagues/leagueScheduleCoverage";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueFormSubmitOptions, LeagueFormValues } from "@/features/leagues/Leagues.types";
import { StatusBadge } from "@/shared/components/badges/StatusBadge";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { Button, PageHeader, Panel } from "@/shared/components/ui";
import { ConfirmModal } from "@/shared/components/modals/ConfirmModal";
import { buildQuickMatchesView } from "@/features/quick-matches/schemas/QuickMatches.schema";

const finalPhasePresetLabels = {
  TOP_4_SINGLE_GAME: "Top 4 - Partido unico",
  TOP_8_SINGLE_GAME: "Top 8 - Partido unico",
  TOP_8_HOME_AWAY: "Top 8 - Partido unico (legado)",
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
  const [structureError, setStructureError] = useState<string | null>(null);
  const [pendingFinish, setPendingFinish] = useState<{
    values: LeagueFormValues;
    options?: LeagueFormSubmitOptions;
    missingMatches: number;
    unfinishedMatches: number;
    duplicateMatches: number;
    unfinishedFinalMatches: number;
    finalPhaseIncomplete: boolean;
  } | null>(null);

  const leagueQuery = useQuery({
    queryKey: leaguesQueryKeys.detail(selectedLeagueId),
    queryFn: ({ signal }) => leaguesService.getLeague(selectedLeagueId, signal),
    enabled: hasValidLeagueId,
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
  const panelError = structureError ?? mutationErrorMessage ?? (leagueQuery.error instanceof Error ? leagueQuery.error.message : null);

  const handleSubmit = async (
    values: Parameters<typeof saveLeague>[0]["values"],
    options?: Parameters<typeof saveLeague>[0]["options"],
  ) => {
    if (!league) {
      return;
    }

    if (values.competitionType !== league.competitionType && league.matchesCount > 0) {
      setStructureError(
        "Esta liga ya tiene partidos. Para cambiar su estructura, vuelve a Competencias y usa el flujo protegido de conversion.",
      );
      return;
    }

    if (
      (league.competitionType === "LEAGUE" || league.competitionType === "ELIMINATION" || league.competitionType === "GROUPS")
      && league.status !== "Finalizada"
      && values.status === "Finalizada"
      && !options?.confirmIncompleteFinish
    ) {
      try {
        const snapshot = await leagueMatchesService.getSnapshot(league.id);
        const viewMatches = buildQuickMatchesView(snapshot.matches, snapshot.teams);
        const audit = league.competitionType === "LEAGUE"
          ? { ...summarizeLeagueSchedule(
              values.teamIds,
              values.regularSeasonFormat,
              viewMatches,
            ), duplicateMatches: 0 }
          : league.competitionType === "GROUPS"
            ? summarizeGroupSchedule(values.groupStageConfig, values.regularSeasonFormat, viewMatches)
            : { missingMatches: 0, unfinishedMatches: 0, duplicateMatches: 0 };
        const unfinishedFinalMatches = snapshot.matches.filter((match) => match.competition_stage === "FINAL_PHASE" && match.status !== "finished").length;
        const finalPhaseIncomplete = (values.finalPhaseEnabled || league.competitionType === "ELIMINATION") && !league.bracketCompleted;
        if (audit.missingMatches > 0 || audit.unfinishedMatches > 0 || audit.duplicateMatches > 0 || finalPhaseIncomplete) {
          setPendingFinish({ values, options, ...audit, unfinishedFinalMatches, finalPhaseIncomplete });
          return;
        }
      } catch (error) {
        setStructureError(error instanceof Error ? error.message : "No pudimos revisar el calendario antes de finalizar.");
        return;
      }
    }

    setStructureError(null);
    const savedLeague = await saveLeague({
      mode: "edit",
      leagueId: league.id,
      values,
      options,
    });

    clearMutationError();
    setFormOpen(false);
    return savedLeague;
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1220px]">
        <PageHeader
          title="Ajustes generales"
          subtitle="Edita los datos administrativos sin mezclar las reglas del modo de juego."
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

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigate(`/leagues/${league.id}/final-phase/settings`)}>
                      <Trophy size={16} />
                      Configurar modo
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        clearMutationError();
                        setFormOpen(true);
                      }}
                    >
                      <Pencil size={16} />
                      Editar datos
                    </Button>
                  </div>
                </div>
              </section>

              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <section className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Configuracion actual</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Categoria</p>
                      <p className="mt-2 truncate font-semibold text-slate-900" title={league.category}>{league.category}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Equipos</p>
                      <p className="mt-2 inline-flex items-center gap-2 font-semibold text-slate-900">
                        <UsersRound size={14} />
                        {league.teamCount}
                      </p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Responsable</p>
                      <p className="mt-2 truncate font-semibold text-slate-900" title={league.responsibleName}>{league.responsibleName}</p>
                    </div>
                    <div className="min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Correo</p>
                      <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                        <Mail className="shrink-0" size={14} />
                        <span className="min-w-0 truncate" title={league.responsibleEmail}>{league.responsibleEmail}</span>
                      </p>
                    </div>
                    {league.competitionType === "LEAGUE" ? (
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Fase regular</p>
                        <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                          <CalendarDays size={14} />
                          {league.regularSeasonFormat === "DOUBLE_ROUND" ? "Ida y vuelta" : "Una vuelta"}
                        </p>
                      </div>
                    ) : null}
                    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Fase final</p>
                      <p className="mt-2 flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
                        <Trophy className="shrink-0" size={14} />
                        <span className="min-w-0 truncate">
                          {league.finalPhaseEnabled
                            ? league.competitionType === "ELIMINATION"
                              ? `${league.finalPhaseQualifiedTeams} participantes - ${finalPhasePresetLabels[league.finalPhasePreset]}`
                              : `${finalPhasePresetLabels[league.finalPhasePreset]} - Top ${league.finalPhaseQualifiedTeams}`
                            : "Desactivada"}
                        </span>
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-300 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Calendario y metricas</p>
                  <div className="mt-4 min-w-0 overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Fechas</p>
                    <p className="mt-2 flex min-w-0 items-center gap-2 font-semibold text-slate-900">
                      <CalendarDays className="shrink-0" size={14} />
                      <span className="min-w-0 truncate">{league.startDate} - {league.endDate}</span>
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
        loading={submitting}
        apiError={mutationError}
        onClose={() => {
          clearMutationError();
          setFormOpen(false);
        }}
        onSubmit={handleSubmit}
      />
      <ConfirmModal
        isOpen={pendingFinish !== null}
        title={pendingFinish?.values.competitionType === "ELIMINATION" ? "Finalizar eliminatoria antes de tiempo" : "Finalizar competencia con fases pendientes"}
        message={pendingFinish
          ? pendingFinish.values.competitionType === "ELIMINATION"
            ? `La llave aun no tiene campeon o conserva ${pendingFinish.unfinishedFinalMatches} cruce(s) abierto(s). Puedes finalizarla de todas formas si hubo bajas o un cierre extraordinario, pero sus partidos quedaran bloqueados. ¿Deseas continuar?`
            : pendingFinish.values.competitionType === "GROUPS"
              ? `Faltan ${pendingFinish.missingMatches} cruce(s) de grupos, hay ${pendingFinish.unfinishedMatches} partido(s) sin finalizar y ${pendingFinish.duplicateMatches} excedente(s).${pendingFinish.finalPhaseIncomplete ? ` La fase final aun no concluye y conserva ${pendingFinish.unfinishedFinalMatches} partido(s) abierto(s).` : ""} Puedes finalizar de todas formas, pero el torneo quedara bloqueado. ¿Deseas continuar?`
            : `Faltan ${pendingFinish.missingMatches} cruce(s) regulares por crear y hay ${pendingFinish.unfinishedMatches} partido(s) regulares sin finalizar.${pendingFinish.finalPhaseIncomplete ? ` La fase final aun no concluye y conserva ${pendingFinish.unfinishedFinalMatches} partido(s) abierto(s).` : ""} Puedes finalizar de todas formas si hubo bajas o un cierre extraordinario. ¿Deseas continuar?`
          : ""}
        confirmText="Finalizar de todas formas"
        confirmVariant="primary"
        loading={submitting}
        onCancel={() => setPendingFinish(null)}
        onConfirm={async () => {
          if (!pendingFinish) return;
          const pending = pendingFinish;
          setPendingFinish(null);
          await handleSubmit(pending.values, { ...pending.options, confirmIncompleteFinish: true });
        }}
      />
    </div>
  );
}

