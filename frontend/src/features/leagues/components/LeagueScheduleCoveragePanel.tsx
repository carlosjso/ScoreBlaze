import { AlertTriangle, CalendarCheck2, CheckCircle2, CircleDashed } from "lucide-react";

import type { LeagueRegularSeasonFormat } from "@/features/leagues/Leagues.types";
import type { GroupScheduleCoverage } from "@/features/leagues/leagueScheduleCoverage";

export function LeagueScheduleCoveragePanel({ coverage, format, scope = "groups" }: { coverage: GroupScheduleCoverage[]; format: LeagueRegularSeasonFormat; scope?: "groups" | "league" }) {
  const expectedMatches = coverage.reduce((total, group) => total + group.expectedMatches, 0);
  const coveredMatches = coverage.reduce((total, group) => total + group.coveredMatches, 0);
  const pendingMatches = Math.max(0, expectedMatches - coveredMatches);
  const duplicateMatches = coverage.reduce((total, group) => total + group.duplicateMatches, 0);
  const percentage = expectedMatches > 0 ? Math.round((coveredMatches / expectedMatches) * 100) : 0;

  return (
    <section className="mt-5 overflow-hidden rounded-[28px] border border-sky-200 bg-[linear-gradient(140deg,#eff9ff_0%,#ffffff_55%,#fff7ed_100%)] shadow-sm">
      <div className="flex flex-col gap-4 border-b border-sky-100 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700"><CalendarCheck2 size={19} /></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-700">Auditoria del calendario</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{scope === "league" ? "Cobertura de la temporada regular" : "Cobertura de la fase de grupos"}</h3>
            <p className="mt-1 text-sm text-slate-500">Solo informa. No crea, mueve ni elimina partidos.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-800">{percentage}% cubierto</span>
          <span className="rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-700">{pendingMatches} pendientes</span>
          {duplicateMatches > 0 ? <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{duplicateMatches} excedentes</span> : null}
        </div>
      </div>

      <div className="grid gap-4 p-5 xl:grid-cols-2">
        {coverage.map((group) => {
          const groupPercentage = group.expectedMatches > 0 ? Math.round((group.coveredMatches / group.expectedMatches) * 100) : 0;
          return (
            <article key={group.groupKey} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-600">{scope === "league" ? "Solo liga" : `Grupo ${group.groupKey}`}</p>
                  <h4 className="mt-1 text-base font-bold text-slate-950">{group.groupName}</h4>
                  <p className="mt-1 text-xs text-slate-500">{group.teamCount} equipos, {group.pairCount} cruces distintos</p>
                </div>
                {group.coveredMatches === group.expectedMatches && group.expectedMatches > 0 ? <CheckCircle2 size={20} className="text-emerald-500" /> : <CircleDashed size={20} className="text-sky-500" />}
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[linear-gradient(90deg,#0ea5e9,#f97316)] transition-all" style={{ width: `${groupPercentage}%` }} /></div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 px-2 py-2"><strong className="block text-sm text-slate-900">{group.coveredMatches}/{group.expectedMatches}</strong><span className="text-[10px] text-slate-500">programados</span></div>
                <div className="rounded-xl bg-slate-50 px-2 py-2"><strong className="block text-sm text-slate-900">{group.finishedMatches}</strong><span className="text-[10px] text-slate-500">finalizados</span></div>
                <div className="rounded-xl bg-slate-50 px-2 py-2"><strong className="block text-sm text-slate-900">{group.pendingFixtures.reduce((total, fixture) => total + fixture.remainingMatches, 0)}</strong><span className="text-[10px] text-slate-500">por crear</span></div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
                <span className="rounded-full bg-sky-50 px-2.5 py-1">Primera vuelta: {group.firstRoundCoveredPairs}/{group.pairCount}</span>
                {format === "DOUBLE_ROUND" ? <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700">Segunda vuelta: {group.secondRoundCoveredPairs}/{group.pairCount}</span> : null}
              </div>

              {group.pendingFixtures.length > 0 ? (
                <details className="mt-4 rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2.5">
                  <summary className="cursor-pointer text-xs font-bold text-slate-700">Ver enfrentamientos pendientes</summary>
                  <div className="mt-3 space-y-2">
                    {group.pendingFixtures.map((fixture) => (
                      <div key={`${fixture.teamAId}-${fixture.teamBId}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                        <span className="truncate">{fixture.label}</span>
                        <span className="shrink-0 font-bold text-orange-700">{fixture.remainingMatches} pendiente{fixture.remainingMatches === 1 ? "" : "s"}</span>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <p className="mt-4 flex items-center gap-2 rounded-[16px] bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700"><CheckCircle2 size={15} /> Todos los cruces requeridos estan registrados.</p>
              )}

              {group.duplicateMatches > 0 ? <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-amber-700"><AlertTriangle size={14} /> Hay {group.duplicateMatches} partido(s) por encima del formato configurado.</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
