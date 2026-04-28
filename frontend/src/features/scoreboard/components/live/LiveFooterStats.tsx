import type { ScoreboardTeamState } from "@/features/scoreboard/Scoreboard.types";

type LiveFooterStatsProps = {
  teamA: ScoreboardTeamState;
  teamB: ScoreboardTeamState;
};

export function LiveFooterStats({ teamA, teamB }: LiveFooterStatsProps) {
  return (
    <footer className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">
          Faltas {teamA.name}
        </p>

        <p className="mt-1 text-4xl font-black text-slate-800">
          {teamA.fouls}
        </p>
      </div>

      <div className="rounded-2xl border border-orange-200 bg-orange-50 px-8 py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-orange-700 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        ScoreBlaze Live
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white px-5 py-4 text-center shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <p className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">
          Faltas {teamB.name}
        </p>

        <p className="mt-1 text-4xl font-black text-slate-800">
          {teamB.fouls}
        </p>
      </div>
    </footer>
  );
}
