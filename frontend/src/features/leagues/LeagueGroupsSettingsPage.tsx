import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, CheckCircle2, Folder, Layers3, Save, Trophy, UsersRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, type Resolver, type UseFormSetValue } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { FormErrors } from "@/features/leagues/components/FormErrors";
import { LeagueGroupStageEditor } from "@/features/leagues/components/LeagueGroupStageEditor";
import { LeagueSectionNav } from "@/features/leagues/components/LeagueSectionNav";
import { createDefaultGroupStageConfig } from "@/features/leagues/groupStageConfig";
import { useLeagueMatchesData } from "@/features/leagues/hooks/useLeagueMatchesData";
import { useLeaguesMutations } from "@/features/leagues/hooks/useLeaguesMutations";
import { leaguesQueryKeys, leaguesService } from "@/features/leagues/Leagues.service";
import type { LeagueFormValues, LeagueStandingRow } from "@/features/leagues/Leagues.types";
import { buildLiveLeagueStandings } from "@/features/leagues/realtime/leagueStandingsRealtime";
import { leagueFormSchema, toLeagueFormValues } from "@/features/leagues/schemas/Leagues.schema";
import { teamsQueryKeys, teamsService } from "@/features/teams/Teams.service";
import { TableEmptyState } from "@/shared/components/table/TableEmptyState";
import { Button, PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type DisplayStandingRow = LeagueStandingRow & { isLive?: boolean; liveSummary?: string | null };

function GroupPositionsTable({ rows, qualifiers }: { rows: DisplayStandingRow[]; qualifiers: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[780px]">
        <div className="grid grid-cols-[52px_minmax(200px,1.4fr)_58px_58px_72px_72px_72px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          <span>Pos</span><span>Equipo</span><span className="text-center">PJ</span><span className="text-center">G</span><span className="text-center">DIF</span><span className="text-center">PF</span><span className="text-center">PC</span>
        </div>
        {rows.map((row) => {
          const qualifies = qualifiers > 0 && row.position <= qualifiers;
          return (
            <div key={row.teamId} className="grid grid-cols-[52px_minmax(200px,1.4fr)_58px_58px_72px_72px_72px] items-center border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg font-bold", qualifies ? "bg-orange-50 text-orange-700" : "text-slate-500")}>{row.position}</span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 truncate font-semibold text-slate-900">{qualifies ? <Trophy size={13} className="shrink-0 text-orange-500" /> : null}{row.teamName}</span>
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

export default function LeagueGroupsSettingsPage() {
  const navigate = useNavigate();
  const { leagueId: leagueIdParam } = useParams();
  const leagueId = Number(leagueIdParam);
  const hasValidLeagueId = Number.isInteger(leagueId) && leagueId > 0;
  const matchesSnapshot = useLeagueMatchesData(hasValidLeagueId ? leagueId : null);
  const hydratedLeagueIdRef = useRef<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [activeGroupKey, setActiveGroupKey] = useState("");

  const leagueQuery = useQuery({
    queryKey: leaguesQueryKeys.detail(leagueId),
    queryFn: ({ signal }) => leaguesService.getLeague(leagueId, signal),
    enabled: hasValidLeagueId,
  });
  const teamsQuery = useQuery({
    queryKey: teamsQueryKeys.catalog(),
    queryFn: ({ signal }) => teamsService.getCatalog(signal),
    enabled: hasValidLeagueId,
  });
  const statsQuery = useQuery({
    queryKey: leaguesQueryKeys.stats(leagueId),
    queryFn: ({ signal }) => leaguesService.getLeagueStats(leagueId, signal),
    enabled: hasValidLeagueId,
  });
  const { submitting, mutationError, mutationErrorMessage, clearMutationError, saveLeague } = useLeaguesMutations();
  const { handleSubmit, reset, setValue, watch, formState } = useForm<LeagueFormValues>({
    resolver: zodResolver(leagueFormSchema) as Resolver<LeagueFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: toLeagueFormValues(null),
  });

  const league = leagueQuery.data ?? null;
  const values = watch();
  const participantCount = new Set(values.teamIds).size;
  const canConfigureGroups = participantCount >= 4;
  const hasSavedGroupConfig = Boolean(league?.groupStageConfig);
  const showGroupEditor = !hasSavedGroupConfig;
  const registeredTeams = useMemo(
    () => (teamsQuery.data ?? []).filter((team) => values.teamIds.includes(team.id)),
    [teamsQuery.data, values.teamIds],
  );
  const teamById = useMemo(() => new Map(registeredTeams.map((team) => [team.id, team])), [registeredTeams]);
  const groupFolders = useMemo(() => (values.groupStageConfig?.groups ?? []).map((group) => {
    const storedGroup = statsQuery.data?.groupStandings.find((candidate) => candidate.groupKey === group.key);
    const baseRows: LeagueStandingRow[] = storedGroup?.standings.length
      ? storedGroup.standings
      : group.teamIds.map((teamId, index) => ({
          position: index + 1,
          teamId,
          teamName: teamById.get(teamId)?.name ?? `Equipo ${teamId}`,
          matchesPlayed: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          pointsDifference: 0,
          standingsPoints: 0,
          totalTeamFouls: 0,
        }));
    const groupMatches = matchesSnapshot.matches.filter((match) => (
      match.competitionStage === "GROUP_STAGE"
      && match.groupStageGroupKey === group.key
      && group.teamIds.includes(match.teamAId)
      && group.teamIds.includes(match.teamBId)
    ));
    return {
      groupKey: group.key,
      groupName: group.name,
      teamIds: group.teamIds,
      matchCount: storedGroup?.matchCount ?? groupMatches.length,
      snapshot: buildLiveLeagueStandings(baseRows, league?.bracketGenerated ? [] : groupMatches, values.standingsTiebreakers),
    };
  }), [league?.bracketGenerated, matchesSnapshot.matches, statsQuery.data?.groupStandings, teamById, values.groupStageConfig?.groups, values.standingsTiebreakers]);
  const activeGroup = groupFolders.find((group) => group.groupKey === activeGroupKey) ?? groupFolders[0] ?? null;
  const locked = Boolean(league?.bracketGenerated || (league?.matchesCount ?? 0) > 0);
  const panelError = mutationErrorMessage
    ?? (leagueQuery.error instanceof Error ? leagueQuery.error.message : null)
    ?? (teamsQuery.error instanceof Error ? teamsQuery.error.message : null)
    ?? (statsQuery.error instanceof Error ? statsQuery.error.message : null);

  useEffect(() => {
    if (!league || (hydratedLeagueIdRef.current === league.id && formState.isDirty)) return;
    reset(toLeagueFormValues(league));
    hydratedLeagueIdRef.current = league.id;
  }, [formState.isDirty, league, reset]);

  useEffect(() => {
    if (groupFolders.length === 0) {
      setActiveGroupKey("");
      return;
    }
    if (!groupFolders.some((group) => group.groupKey === activeGroupKey)) {
      setActiveGroupKey(groupFolders[0].groupKey);
    }
  }, [activeGroupKey, groupFolders]);

  const setFormValue = <K extends keyof LeagueFormValues>(field: K, value: LeagueFormValues[K]) => {
    type SetValueField = Parameters<UseFormSetValue<LeagueFormValues>>[0];
    type SetValueValue = Parameters<UseFormSetValue<LeagueFormValues>>[1];

    clearMutationError();
    setSaved(false);
    setValue(field as SetValueField, value as SetValueValue, { shouldDirty: true, shouldValidate: true });
  };

  const submit = async (nextValues: LeagueFormValues) => {
    if (!league || league.competitionType !== "GROUPS" || !nextValues.groupStageConfig) return;
    const savedLeague = await saveLeague({
      mode: "edit",
      leagueId: league.id,
      values: { ...nextValues, finalPhaseTwoLegs: false },
    });
    reset(toLeagueFormValues(savedLeague));
    await statsQuery.refetch();
    setSaved(true);
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1320px]">
        <PageHeader
          title="Grupos"
          subtitle="Crea, edita y consulta las posiciones de cada grupo desde un solo apartado."
          actions={<LeagueSectionNav league={league} active="groups" />}
        />

        <Panel>
          {panelError ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{panelError}</div> : null}

          {!leagueQuery.isPending && (!hasValidLeagueId || !league) ? (
            <TableEmptyState mode="filtered" title="Torneo no encontrado" description="No encontramos la competencia que intentaste abrir." actionLabel="Volver a ligas" onAction={() => navigate("/leagues")} />
          ) : null}

          {league && league.competitionType !== "GROUPS" ? (
            <TableEmptyState mode="filtered" title="Esta competencia no usa grupos" description="La organizacion por grupos solo esta disponible en el cuarto pilar." actionLabel="Volver al dashboard" onAction={() => navigate(`/leagues/${league.id}`)} />
          ) : null}

          {league?.competitionType === "GROUPS" ? (
            <form className="space-y-5" onSubmit={handleSubmit(submit)}>
              <section className="overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(135deg,#eff9ff_0%,#ffffff_55%,#fff7ed_100%)] shadow-sm">
                <div className="flex flex-col gap-4 px-5 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><Layers3 size={21} /></span>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-sky-700">Cuarto pilar</p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">{league.name}</h2>
                      <p className="mt-1 text-sm text-slate-600">{participantCount} equipos inscritos - {values.groupStageConfig?.groups.length ?? 0} grupos definidos</p>
                    </div>
                  </div>
                  {hasSavedGroupConfig ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={15} /> Grupos listos
                    </span>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => navigate(`/leagues/${league.id}/teams/manage`)}>
                      <UsersRound size={15} /> Administrar equipos
                    </Button>
                  )}
                </div>
              </section>

              {!canConfigureGroups ? (
                <section className="rounded-[26px] border border-amber-200 bg-amber-50 px-5 py-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-700" />
                      <div><p className="font-bold text-slate-950">Primero reune al menos 4 equipos</p><p className="mt-1 text-sm text-slate-600">Faltan {Math.max(0, 4 - participantCount)} para crear dos grupos validos.</p></div>
                    </div>
                    <Button type="button" variant="primary" onClick={() => navigate(`/leagues/${league.id}/teams/manage`)}>Reunir equipos</Button>
                  </div>
                </section>
              ) : showGroupEditor ? (
                <fieldset disabled={league.bracketGenerated} className="space-y-5 disabled:opacity-75">
                  <LeagueGroupStageEditor
                    config={values.groupStageConfig ?? createDefaultGroupStageConfig()}
                    teams={registeredTeams}
                    finalPhaseEnabled={values.finalPhaseEnabled}
                    regularSeasonFormat={values.regularSeasonFormat}
                    locked={locked}
                    showRules={false}
                    error={formState.errors.groupStageConfig?.message}
                    onChange={(config) => setFormValue("groupStageConfig", config)}
                    onRegularSeasonFormatChange={() => undefined}
                    onFinalPhaseChange={() => undefined}
                  />
                </fieldset>
              ) : null}

              {hasSavedGroupConfig && values.groupStageConfig && groupFolders.length > 0 ? (
                <section className="overflow-hidden rounded-[28px] border border-slate-300 bg-white shadow-sm">
                  <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-5 sm:px-6">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600">Posiciones por grupo</p>
                    <h3 className="text-xl font-bold text-slate-950">Carpetas de la competencia</h3>
                    <p className="text-sm text-slate-500">Selecciona un grupo para ver solamente su tabla, partidos y puestos de clasificacion.</p>
                  </div>

                  <div className="overflow-x-auto border-b border-slate-200 bg-slate-100/80 px-4 pt-4">
                    <div className="flex min-w-max items-end gap-2">
                      {groupFolders.map((group) => {
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
                          <h4 className="mt-1 text-xl font-bold text-slate-950">{activeGroup.groupName}</h4>
                          <p className="mt-1 text-xs text-slate-500">{activeGroup.teamIds.length} equipos - {activeGroup.matchCount} partidos registrados</p>
                        </div>
                        <span className="w-fit rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700">
                          {values.groupStageConfig.qualifiersPerGroup} clasifican
                        </span>
                      </div>
                      <GroupPositionsTable rows={activeGroup.snapshot.rows} qualifiers={values.groupStageConfig.qualifiersPerGroup} />
                    </div>
                  ) : null}
                </section>
              ) : null}

              <FormErrors message={mutationError instanceof Error ? mutationError.message : null} />
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button type="button" variant="outline" onClick={() => navigate(`/leagues/${league.id}`)}><ArrowLeft size={15} /> Volver al dashboard</Button>
                <div className="flex items-center justify-end gap-3">
                  {saved ? <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Grupos guardados</span> : null}
                  {showGroupEditor ? (
                    <Button type="submit" variant="primary" disabled={!canConfigureGroups || !values.groupStageConfig || locked || submitting || !formState.isValid}>
                      <Save size={15} /> {submitting ? "Guardando..." : "Guardar grupos"}
                    </Button>
                  ) : null}
                </div>
              </div>
            </form>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
