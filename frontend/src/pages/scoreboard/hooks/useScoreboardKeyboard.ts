import { useEffect } from "react";

import type { ScoreboardTeamKey } from "@/pages/scoreboard/Scoreboard.types";

type UseScoreboardKeyboardParams = {
  enabled: boolean;
  onAddPoints: (points: number, team: ScoreboardTeamKey) => void;
  onMiss: (team: ScoreboardTeamKey) => void;
  onFoul: (team: ScoreboardTeamKey) => void;
  onRebound: (team: ScoreboardTeamKey) => void;
  onAssist: (team: ScoreboardTeamKey) => void;
  onToggleClock: () => void;
  onResetClock: () => void;
  onResetShotClock24: () => void;
  onSetShotClock14: () => void;
  onNextPeriod: () => void;
  onUndo: () => void;
  onToggleArrow: () => void;
  onResetGame: () => void;
};

export function useScoreboardKeyboard({
  enabled,
  onAddPoints,
  onMiss,
  onFoul,
  onRebound,
  onAssist,
  onToggleClock,
  onResetClock,
  onResetShotClock24,
  onSetShotClock14,
  onNextPeriod,
  onUndo,
  onToggleArrow,
  onResetGame,
}: UseScoreboardKeyboardParams) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;

      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (isTyping) return;

      const key = event.key.toLowerCase();

      const actions: Record<string, () => void> = {
        // Equipo A
        q: () => onAddPoints(1, "A"),
        w: () => onAddPoints(2, "A"),
        e: () => onAddPoints(3, "A"),
        a: () => onMiss("A"),
        s: () => onFoul("A"),
        d: () => onRebound("A"),
        f: () => onAssist("A"),

        // Equipo B
        u: () => onAddPoints(1, "B"),
        i: () => onAddPoints(2, "B"),
        o: () => onAddPoints(3, "B"),
        j: () => onMiss("B"),
        k: () => onFoul("B"),
        l: () => onRebound("B"),
        n: () => onAssist("B"),
        ñ: () => onAssist("B"),
        ";": () => onAssist("B"),

        // Controles generales
        c: onToggleClock,
        v: onResetClock,
        t: onResetShotClock24,
        g: onSetShotClock14,
        b: onNextPeriod,
        z: onUndo,
        x: onToggleArrow,
        r: onResetGame,
      };

      const action = actions[key];

      if (!action) return;

      event.preventDefault();
      action();
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    onAddPoints,
    onMiss,
    onFoul,
    onRebound,
    onAssist,
    onToggleClock,
    onResetClock,
    onResetShotClock24,
    onSetShotClock14,
    onNextPeriod,
    onUndo,
    onToggleArrow,
    onResetGame,
  ]);
}