import type { ScoreboardState } from "@/pages/scoreboard/Scoreboard.types";

type GeneralControlsProps = {
  state: ScoreboardState;
  onToggleClock: () => void;
  onResetClock: () => void;
  onResetShotClock24: () => void;
  onSetShotClock14: () => void;
  onNextPeriod: () => void;
  onToggleArrow: () => void;
  onUndo: () => void;
  onResetGame: () => void;
};

export function GeneralControls({
  state,
  onToggleClock,
  onResetClock,
  onResetShotClock24,
  onSetShotClock14,
  onNextPeriod,
  onToggleArrow,
  onUndo,
  onResetGame,
}: GeneralControlsProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">
        Controles generales
      </h3>

      <div className="mt-5 grid gap-2">
        <button
          onClick={onToggleClock}
          className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white"
        >
          {state.clockRunning ? "Pausar reloj" : "Iniciar reloj"}
        </button>

        <button
          onClick={onResetClock}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white"
        >
          Reloj a 10:00
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onResetShotClock24}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
          >
            Tiro 24
          </button>

          <button
            onClick={onSetShotClock14}
            className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
          >
            Tiro 14
          </button>
        </div>

        <button
          onClick={onNextPeriod}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
        >
          Q{state.period} → Q{state.period >= 4 ? 1 : state.period + 1}
        </button>

        <button
          onClick={onToggleArrow}
          className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-800"
        >
          Posesión: {state.arrow}
        </button>

        <button
          onClick={onUndo}
          className="rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-bold text-yellow-700"
        >
          Deshacer última
        </button>

        <button
          onClick={onResetGame}
          className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
        >
          Reiniciar partido
        </button>
      </div>
    </div>
  );
}