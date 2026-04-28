import type { ScoreboardState } from "@/features/scoreboard/Scoreboard.types";

type ScoreboardDisplayProps = {
  state: ScoreboardState;
  formattedClock: string;
  formattedShotClock: string;
};

export function ScoreboardDisplay({
  state,
  formattedClock,
  formattedShotClock,
}: ScoreboardDisplayProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
        <div className="rounded-2xl bg-white/10 p-5">
          <p className="text-sm uppercase tracking-[0.2em] text-white/75">
            Equipo A
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-tight text-white">
            {state.teamA.name}
          </h2>

          <p className="mt-3 text-sm font-semibold text-white/80">
            Faltas: {state.teamA.fouls}
          </p>
        </div>

        <div className="text-center">
          <div className="text-7xl font-black tracking-tight">
            {state.teamA.score} - {state.teamB.score}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-white/10 px-4 py-2">
              Q{state.period}
            </span>

            <span className="rounded-full bg-white/10 px-4 py-2">
              {formattedClock}
            </span>

            <span className="rounded-full bg-orange-500 px-4 py-2">
              Tiro {formattedShotClock}
            </span>

            <span className="rounded-full bg-white/10 px-4 py-2">
              Posesion: {state.arrow}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/10 p-5 text-right">
          <p className="text-sm uppercase tracking-[0.2em] text-white/75">
            Equipo B
          </p>

          <h2 className="mt-2 text-4xl font-black tracking-tight text-white">
            {state.teamB.name}
          </h2>

          <p className="mt-3 text-sm font-semibold text-white/80">
            Faltas: {state.teamB.fouls}
          </p>
        </div>
      </div>
    </div>
  );
}

