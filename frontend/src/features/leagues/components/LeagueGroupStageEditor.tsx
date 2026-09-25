import { ArrowRight, LockKeyhole, Plus, Repeat2, Shuffle, UsersRound, X } from "lucide-react";

import type { LeagueGroupStageConfig, LeagueRegularSeasonFormat } from "@/features/leagues/Leagues.types";
import type { ApiTeam } from "@/features/teams/Teams.types";
import { TeamLogo } from "@/features/teams/components/TeamLogo";
import { Button, Select } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type LeagueGroupStageEditorProps = {
  config: LeagueGroupStageConfig;
  teams: ApiTeam[];
  finalPhaseEnabled: boolean;
  regularSeasonFormat: LeagueRegularSeasonFormat;
  locked?: boolean;
  showDistribution?: boolean;
  showRules?: boolean;
  error?: string;
  onChange: (config: LeagueGroupStageConfig) => void;
  onRegularSeasonFormatChange: (format: LeagueRegularSeasonFormat) => void;
  onFinalPhaseChange: (enabled: boolean, qualifiedTeams: number) => void;
};

function getNextGroupKey(groups: LeagueGroupStageConfig["groups"]) {
  const used = new Set(groups.map((group) => group.key));
  for (let index = 0; index < 16; index += 1) {
    const key = String.fromCharCode(65 + index);
    if (!used.has(key)) return key;
  }
  return String(groups.length + 1);
}

export function LeagueGroupStageEditor({
  config,
  teams,
  finalPhaseEnabled,
  regularSeasonFormat,
  locked = false,
  showDistribution = true,
  showRules = true,
  error,
  onChange,
  onRegularSeasonFormatChange,
  onFinalPhaseChange,
}: LeagueGroupStageEditorProps) {
  const assignedIds = new Set(config.groups.flatMap((group) => group.teamIds));
  const availableTeams = teams.filter((team) => !assignedIds.has(team.id));
  const smallestGroupSize = config.groups.length > 0
    ? Math.min(...config.groups.map((group) => group.teamIds.length))
    : 0;
  const maxQualifiersPerGroup = Math.min(smallestGroupSize, Math.floor(32 / Math.max(1, config.groups.length)));
  const fixedQualified = config.groups.length * config.qualifiersPerGroup;
  const maxExtraSlots = Math.max(0, Math.min(assignedIds.size - fixedQualified, 32 - fixedQualified));
  const totalQualified = fixedQualified + config.bestExtraSlots;
  const canShuffleTeams = config.groups.length >= 2
    && teams.length >= config.groups.length * 2
    && teams.length <= config.groups.length * 5;

  const commit = (nextConfig: LeagueGroupStageConfig) => onChange(nextConfig);

  const addGroup = () => {
    if (config.groups.length >= 16) return;
    const key = getNextGroupKey(config.groups);
    commit({
      ...config,
      groups: [...config.groups, { key, name: `Grupo ${key}`, teamIds: [] }],
    });
  };

  const removeGroup = (groupKey: string) => {
    if (config.groups.length <= 2) return;
    const nextGroups = config.groups.filter((group) => group.key !== groupKey);
    const nextQualifiersPerGroup = Math.min(
      config.qualifiersPerGroup,
      Math.min(...nextGroups.map((group) => group.teamIds.length)),
    );
    const nextConfig = {
      ...config,
      groups: nextGroups,
      qualifiersPerGroup: nextQualifiersPerGroup,
      bestExtraSlots: 0,
    };
    commit(nextConfig);
    if (finalPhaseEnabled) onFinalPhaseChange(true, nextGroups.length * nextQualifiersPerGroup);
  };

  const addTeam = (groupKey: string, teamId: number) => {
    if (!teamId) return;
    commit({
      ...config,
      groups: config.groups.map((group) =>
        group.key === groupKey && group.teamIds.length < 5
          ? { ...group, teamIds: [...group.teamIds, teamId] }
          : group,
      ),
    });
  };

  const removeTeam = (groupKey: string, teamId: number) => {
    const nextGroups = config.groups.map((group) =>
      group.key === groupKey
        ? { ...group, teamIds: group.teamIds.filter((id) => id !== teamId) }
        : group,
    );
    const nextSmallestSize = Math.min(...nextGroups.map((group) => group.teamIds.length));
    const nextQualifiersPerGroup = Math.min(config.qualifiersPerGroup, nextSmallestSize);
    const nextConfig = {
      ...config,
      groups: nextGroups,
      qualifiersPerGroup: nextQualifiersPerGroup,
      bestExtraSlots: 0,
    };
    commit(nextConfig);
    if (finalPhaseEnabled) onFinalPhaseChange(true, nextGroups.length * nextQualifiersPerGroup);
  };

  const updateQualification = (qualifiersPerGroup: number, bestExtraSlots: number) => {
    const nextConfig = { ...config, qualifiersPerGroup, bestExtraSlots };
    commit(nextConfig);
    onFinalPhaseChange(true, config.groups.length * qualifiersPerGroup + bestExtraSlots);
  };

  const shuffleTeams = () => {
    if (!canShuffleTeams) return;
    const shuffledIds = teams.map((team) => team.id);
    for (let index = shuffledIds.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffledIds[index], shuffledIds[swapIndex]] = [shuffledIds[swapIndex], shuffledIds[index]];
    }
    commit({
      ...config,
      groups: config.groups.map((group, groupIndex) => ({
        ...group,
        teamIds: shuffledIds.filter((_, teamIndex) => teamIndex % config.groups.length === groupIndex),
      })),
    });
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-sky-200 bg-[linear-gradient(145deg,#f0f9ff_0%,#ffffff_58%,#fff7ed_100%)] shadow-[0_16px_40px_rgba(14,116,144,0.08)]">
      <div className="flex flex-col gap-4 border-b border-sky-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <UsersRound size={19} />
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Fase de grupos</p>
            <h3 className="mt-1 text-base font-bold text-slate-950">{showDistribution ? "Distribuye los equipos" : "Reglas de los grupos"}</h3>
            <p className="mt-1 text-sm leading-5 text-slate-500">{showDistribution ? "Cada equipo debe estar una sola vez. Los partidos se crean despues, manualmente." : "Ajusta las vueltas, clasificados y cierre sin cambiar los grupos ya definidos."}</p>
          </div>
        </div>
        {showDistribution ? <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-700">{config.groups.length} grupos</span>
          <span className="rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-bold text-orange-700">{assignedIds.size} equipos</span>
        </div> : null}
      </div>

      {locked ? (
        <div className="mx-5 mt-5 flex items-start gap-3 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <LockKeyhole size={17} className="mt-0.5 shrink-0" />
          <span><strong>Distribucion protegida.</strong> Esta competencia ya tiene partidos. Eliminalos antes de mover equipos o cambiar grupos.</span>
        </div>
      ) : null}

      <div className="p-5">
        {showDistribution ? <>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1">
            {(["MANUAL", "UNIFORM"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={locked}
                onClick={() => commit({ ...config, mode })}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed",
                  config.mode === mode ? "bg-sky-100 text-sky-800" : "text-slate-500 hover:bg-slate-50",
                )}
              >
                {mode === "MANUAL" ? "Grupos flexibles" : "Mismo tamano"}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={shuffleTeams}
              disabled={locked || !canShuffleTeams}
              title={canShuffleTeams ? "Distribuye aleatoriamente todos los equipos" : `Con ${teams.length} equipos necesitas entre ${Math.ceil(teams.length / 5)} y ${Math.floor(teams.length / 2)} grupos.`}
            >
              <Shuffle size={15} /> Sortear equipos
            </Button>
            <Button type="button" variant="outline" onClick={addGroup} disabled={locked || config.groups.length >= 16}>
              <Plus size={15} /> Agregar grupo
            </Button>
          </div>
        </div>

        {!canShuffleTeams ? (
          <div className="mb-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
            El sorteo necesita grupos con espacio para todos. Con {teams.length} equipos crea entre {Math.ceil(teams.length / 5)} y {Math.floor(teams.length / 2)} grupos antes de sortear.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-2">
          {config.groups.map((group, groupIndex) => (
            <article key={group.key} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-sm font-black text-orange-700">{group.key}</span>
                <input
                  value={group.name}
                  disabled={locked}
                  maxLength={50}
                  aria-label={`Nombre del grupo ${group.key}`}
                  onChange={(event) => commit({
                    ...config,
                    groups: config.groups.map((current) => current.key === group.key ? { ...current, name: event.target.value } : current),
                  })}
                  className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  title="Eliminar grupo"
                  disabled={locked || config.groups.length <= 2}
                  onClick={() => removeGroup(group.key)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {group.teamIds.map((teamId) => {
                  const team = teams.find((candidate) => candidate.id === teamId);
                  if (!team) return null;
                  return (
                    <div key={teamId} className="flex items-center gap-3 rounded-[15px] border border-slate-100 bg-slate-50 px-3 py-2.5">
                      <TeamLogo name={team.name} logoBase64={team.logo_base64} seed={groupIndex} className="h-8 w-8 rounded-lg text-[10px]" />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{team.name}</span>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => removeTeam(group.key, teamId)}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-600 disabled:cursor-not-allowed"
                        aria-label={`Quitar ${team.name} de ${group.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <select
                value=""
                disabled={locked || group.teamIds.length >= 5 || availableTeams.length === 0}
                onChange={(event) => addTeam(group.key, Number(event.target.value))}
                className="mt-3 w-full rounded-[14px] border border-dashed border-sky-200 bg-sky-50/60 px-3 py-2.5 text-sm font-semibold text-sky-800 outline-none transition hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={`Agregar equipo a ${group.name}`}
              >
                <option value="">{group.teamIds.length >= 5 ? "Grupo completo" : availableTeams.length === 0 ? "No hay equipos disponibles" : "+ Agregar equipo"}</option>
                {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <p className="mt-2 text-right text-[11px] font-semibold text-slate-400">{group.teamIds.length}/5 equipos</p>
            </article>
          ))}
        </div>

        {availableTeams.length > 0 ? (
          <div className="mt-4 rounded-[18px] border border-dashed border-slate-300 bg-white/70 px-4 py-3 text-sm text-slate-600">
            <strong>{availableTeams.length} sin asignar:</strong> {availableTeams.map((team) => team.name).join(", ")}
          </div>
        ) : null}
        </> : null}

        {showRules ? <>
        <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><Repeat2 size={16} /></span>
            <div>
              <p className="text-sm font-bold text-slate-950">Encuentros dentro de cada grupo</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Esta regla solo sirve para revisar la cobertura. No genera partidos automaticamente.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {([
              ["SINGLE_ROUND", "Una vuelta", "Cada pareja se enfrenta una vez."],
              ["DOUBLE_ROUND", "Ida y vuelta", "Cada pareja se enfrenta dos veces."],
            ] as const).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                disabled={locked}
                onClick={() => onRegularSeasonFormatChange(value)}
                className={cn(
                  "rounded-[16px] border px-3 py-3 text-left transition disabled:cursor-not-allowed",
                  regularSeasonFormat === value ? "border-sky-300 bg-sky-50 text-sky-900" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-sky-200",
                )}
              >
                <span className="block text-sm font-bold">{label}</span>
                <span className="mt-1 block text-xs opacity-75">{description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[22px] border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-950">Cierre eliminatorio</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Decide si termina con ganadores por grupo, sin campeon general, o si envia clasificados a una llave.</p>
            </div>
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                const nextEnabled = !finalPhaseEnabled;
                const nextQualifiersPerGroup = nextEnabled ? Math.max(1, config.qualifiersPerGroup) : 0;
                const minimumQualified = config.groups.length * nextQualifiersPerGroup;
                const nextExtraSlots = nextEnabled
                  ? Math.max(config.bestExtraSlots, Math.max(0, 2 - minimumQualified))
                  : 0;
                commit({
                  ...config,
                  qualifiersPerGroup: nextQualifiersPerGroup,
                  bestExtraSlots: nextExtraSlots,
                });
                onFinalPhaseChange(nextEnabled, minimumQualified + nextExtraSlots);
              }}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed",
                finalPhaseEnabled ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-slate-50 text-slate-600",
              )}
            >
              {finalPhaseEnabled ? "Llave activada" : "Sin llave final"}
            </button>
          </div>

          {finalPhaseEnabled ? (
            <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Select
                label="Clasifican por grupo"
                value={String(config.qualifiersPerGroup)}
                disabled={locked || smallestGroupSize < 1}
                onChange={(event) => updateQualification(Number(event.target.value), config.bestExtraSlots)}
              >
                <option value="0">Selecciona</option>
                {Array.from({ length: maxQualifiersPerGroup }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}
              </Select>
              <Select
                label="Mejores extras"
                value={String(config.bestExtraSlots)}
                disabled={locked || config.qualifiersPerGroup < 1}
                onChange={(event) => updateQualification(config.qualifiersPerGroup, Number(event.target.value))}
              >
                {Array.from({ length: maxExtraSlots + 1 }, (_, count) => count).map((count) => <option key={count} value={count}>{count}</option>)}
              </Select>
              <div className="flex min-h-10 items-center gap-2 rounded-[14px] bg-orange-50 px-4 py-2 text-sm font-bold text-orange-800">
                {totalQualified} avanzan <ArrowRight size={15} />
              </div>
              <p className="text-xs leading-5 text-slate-500 sm:col-span-3">Los extras se comparan por porcentaje de victorias, diferencia promedio y puntos promedio. La siembra de la llave se decide despues.</p>
            </div>
          ) : null}
        </div>
        </> : null}

        {error ? <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p> : null}
      </div>
    </section>
  );
}
