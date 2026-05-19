import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { leagueTrackedStatOptions, normalizeLeagueTrackedStats } from "@/features/leagues/Leagues.types";
import { getQuickMatchTrackedStats, saveQuickMatchTrackedStats } from "@/features/quick-matches/quickMatchSettings";
import { Button, PageHeader, Panel } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

export default function QuickMatchSettingsPage() {
  const [trackedStats, setTrackedStats] = useState<string[]>(() => getQuickMatchTrackedStats());
  const [saveFeedback, setSaveFeedback] = useState<"idle" | "saved">("idle");

  const displayedTrackedStats = useMemo(
    () => normalizeLeagueTrackedStats([...leagueTrackedStatOptions, ...trackedStats]),
    [trackedStats],
  );

  const toggleTrackedStat = (stat: string) => {
    setTrackedStats((current) => {
      const nextTrackedStats = current.includes(stat)
        ? current.filter((currentStat) => currentStat !== stat)
        : [...current, stat];

      return normalizeLeagueTrackedStats(nextTrackedStats);
    });
    setSaveFeedback("idle");
  };

  const handleSave = () => {
    setTrackedStats(saveQuickMatchTrackedStats(trackedStats));
    setSaveFeedback("saved");
    window.setTimeout(() => setSaveFeedback("idle"), 1400);
  };

  return (
    <div className="sb-page">
      <div className="sb-page-shell max-w-[1220px]">
        <PageHeader
          title="Ajustes de partidos rapidos"
          subtitle="Define que metricas se habilitan por defecto cuando creas un partido rapido nuevo."
        />

        <Panel className="space-y-5">
          <section className="rounded-[26px] border border-orange-100 bg-[linear-gradient(180deg,_rgba(255,246,238,0.96),_#ffffff)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                  <ShieldCheck size={18} />
                </span>

                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Metricas para partidos rapidos</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Esto aplica a los partidos rapidos nuevos. Los partidos ya creados conservan sus metricas actuales.
                  </p>
                </div>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-orange-600 shadow-sm">
                <span>{trackedStats.length}</span>
                <span>activas</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {displayedTrackedStats.map((stat) => {
                const active = trackedStats.includes(stat);

                return (
                  <button
                    key={stat}
                    type="button"
                    onClick={() => toggleTrackedStat(stat)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-[18px] border px-4 py-3 text-left transition",
                      active
                        ? "border-orange-200 bg-orange-50 text-slate-900 shadow-[0_10px_24px_rgba(249,115,22,0.10)]"
                        : "border-slate-200 bg-white text-slate-500 hover:border-orange-200 hover:bg-orange-50/50",
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{stat}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em]",
                          active ? "bg-white text-orange-600" : "bg-slate-100 text-slate-400",
                        )}
                      >
                        {active ? "Activa" : "Oculta"}
                      </span>
                    </div>
                    <p className={cn("mt-2 text-xs", active ? "text-slate-500" : "text-slate-400")}>
                      {active
                        ? "Se habilitara al crear partidos rapidos nuevos."
                        : "Tocala para activarla por defecto en PR."}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="button" variant="primary" onClick={handleSave}>
              {saveFeedback === "saved" ? "Guardado" : "Guardar metricas"}
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
