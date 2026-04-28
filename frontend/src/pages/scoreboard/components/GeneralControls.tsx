import { Keyboard, Mouse } from "lucide-react";

import type {
  ScoreboardControlMode,
  ScoreboardState,
} from "@/pages/scoreboard/Scoreboard.types";

type GeneralControlsProps = {
  state: ScoreboardState;
  onToggleClock: () => void;
  onResetClock: () => void;
  onResetShotClock24: () => void;
  onSetShotClock14: () => void;
  onNextPeriod: () => void;
  onToggleArrow: () => void;
  onSetControlMode: (mode: ScoreboardControlMode) => void;
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
  onSetControlMode,
  onUndo,
  onResetGame,
}: GeneralControlsProps) {
  const keyboardMode = state.controlMode === "keyboard";
  const actionButtonsDisabled = keyboardMode;
  const baseActionClassName =
    "rounded-2xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50";
  const nextMode: ScoreboardControlMode = keyboardMode ? "buttons" : "keyboard";
  const modeButtonLabel = keyboardMode
    ? "Cambiar a modo botones"
    : "Cambiar a modo teclado";

  const withShortcut = (label: string, shortcut: string) =>
    keyboardMode ? `${label} [${shortcut}]` : label;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-slate-950">
            Controles generales
          </h3>

          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            {keyboardMode ? "Modo teclado activo" : "Modo botones activo"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onSetControlMode(nextMode)}
          aria-label={modeButtonLabel}
          title={modeButtonLabel}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 transition hover:border-orange-300 hover:bg-orange-100"
        >
          {keyboardMode ? <Keyboard size={18} /> : <Mouse size={18} />}
        </button>
      </div>

      <div className="mt-5 grid gap-2">
        <button
          onClick={onToggleClock}
          disabled={actionButtonsDisabled}
          className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut(
            state.clockRunning ? "Pausar reloj" : "Iniciar reloj",
            "C",
          )}
        </button>

        <button
          onClick={onResetClock}
          disabled={actionButtonsDisabled}
          className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {withShortcut("Reloj a 10:00", "V")}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onResetShotClock24}
            disabled={actionButtonsDisabled}
            className={`${baseActionClassName} bg-slate-100 text-slate-800`}
          >
            {withShortcut("Tiro 24", "T")}
          </button>

          <button
            onClick={onSetShotClock14}
            disabled={actionButtonsDisabled}
            className={`${baseActionClassName} bg-slate-100 text-slate-800`}
          >
            {withShortcut("Tiro 14", "G")}
          </button>
        </div>

        <button
          onClick={onNextPeriod}
          disabled={actionButtonsDisabled}
          className={`${baseActionClassName} bg-slate-100 text-slate-800`}
        >
          {withShortcut(
            `Q${state.period} -> Q${state.period >= 4 ? 1 : state.period + 1}`,
            "B",
          )}
        </button>

        <button
          onClick={onToggleArrow}
          disabled={actionButtonsDisabled}
          className={`${baseActionClassName} bg-slate-100 text-slate-800`}
        >
          {withShortcut(`Posesion: ${state.arrow}`, "X")}
        </button>

        <button
          onClick={onUndo}
          disabled={actionButtonsDisabled}
          className={`${baseActionClassName} bg-yellow-50 text-yellow-700`}
        >
          {withShortcut("Deshacer ultima", "Z")}
        </button>

        <button
          onClick={onResetGame}
          disabled={actionButtonsDisabled}
          className={`${baseActionClassName} bg-red-50 text-red-700`}
        >
          {withShortcut("Reiniciar partido", "R")}
        </button>
      </div>
    </div>
  );
}
