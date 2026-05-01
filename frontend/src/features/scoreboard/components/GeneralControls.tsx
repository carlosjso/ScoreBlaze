import { Flag, Keyboard, Mouse, Play } from "lucide-react";

import type {
  ScoreboardControlMode,
  ScoreboardState,
} from "@/features/scoreboard/Scoreboard.types";
import { cn } from "@/shared/utils/cn";

type GeneralControlsProps = {
  state: ScoreboardState;
  disabled?: boolean;
  onToggleClock: () => void;
  onResetClock: () => void;
  onResetShotClock24: () => void;
  onSetShotClock14: () => void;
  onNextPeriod: () => void;
  onToggleArrow: () => void;
  onSetControlMode: (mode: ScoreboardControlMode) => void;
  onUndo: () => void;
  onResetGame: () => void;
  onStartMatch?: () => void;
  startMatchActive?: boolean;
  startMatchDisabled?: boolean;
  startMatchPending?: boolean;
  startMatchLabel?: string;
  onFinishMatch?: () => void;
  finishMatchActive?: boolean;
  finishMatchDisabled?: boolean;
  finishMatchPending?: boolean;
  finishMatchLabel?: string;
};

export function GeneralControls({
  state,
  disabled = false,
  onToggleClock,
  onResetClock,
  onResetShotClock24,
  onSetShotClock14,
  onNextPeriod,
  onToggleArrow,
  onSetControlMode,
  onUndo,
  onResetGame,
  onStartMatch,
  startMatchActive = false,
  startMatchDisabled = false,
  startMatchPending = false,
  startMatchLabel = "Iniciar partido",
  onFinishMatch,
  finishMatchActive = false,
  finishMatchDisabled = false,
  finishMatchPending = false,
  finishMatchLabel = "Finalizar partido",
}: GeneralControlsProps) {
  const keyboardMode = state.controlMode === "keyboard";
  const actionButtonsDisabled = keyboardMode || disabled;
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
          disabled={disabled}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
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

        {onStartMatch || onFinishMatch ? (
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="mb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Estado del partido
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {onStartMatch ? (
                <button
                  onClick={onStartMatch}
                  disabled={disabled || startMatchDisabled || startMatchPending}
                  className={cn(
                    "flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed",
                    startMatchActive
                      ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_10px_22px_rgba(16,185,129,0.24)]"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
                    (disabled || startMatchPending) && "opacity-60",
                    !startMatchActive && startMatchDisabled && "opacity-45",
                  )}
                >
                  <Play size={16} />
                  <span>{startMatchPending ? "Iniciando..." : startMatchLabel}</span>
                </button>
              ) : null}

              {onFinishMatch ? (
                <button
                  onClick={onFinishMatch}
                  disabled={disabled || finishMatchDisabled || finishMatchPending}
                  className={cn(
                    "flex min-h-[56px] items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed",
                    finishMatchActive
                      ? "border-red-500 bg-red-500 text-white shadow-[0_10px_22px_rgba(239,68,68,0.24)]"
                      : "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
                    (disabled || finishMatchPending) && "opacity-60",
                    !finishMatchActive && finishMatchDisabled && "opacity-45",
                  )}
                >
                  <Flag size={16} />
                  <span>{finishMatchPending ? "Finalizando..." : finishMatchLabel}</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

