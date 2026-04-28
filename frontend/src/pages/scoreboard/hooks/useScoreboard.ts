import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  saveMatchEvent,
  syncScoreboardState,
} from "@/pages/scoreboard/Scoreboard.service";

import type {
  ScoreboardHistoryEvent,
  ScoreboardState,
  ScoreboardTeamKey,
} from "@/pages/scoreboard/Scoreboard.types";

const START_CLOCK_SECONDS = 10 * 60;
const START_SHOT_CLOCK_SECONDS = 24;
const SHOT_CLOCK_RESET_SECONDS = 14;
const CLOCK_STEP_MS = 1000;
const CLOCK_TICK_MS = 100;

const BASE_STORAGE_KEY = "scoreboard.state.v1";

const DEFAULT_PLAYERS_A = ["A1", "A2", "A3", "A4", "A5"];
const DEFAULT_PLAYERS_B = ["B1", "B2", "B3", "B4", "B5"];

const createInitialState = (): ScoreboardState => ({
  teamA: {
    key: "A",
    name: "Frailes",
    logo: undefined,
    score: 0,
    fouls: 0,
    selectedPlayer: DEFAULT_PLAYERS_A[0],
    players: DEFAULT_PLAYERS_A,
  },
  teamB: {
    key: "B",
    name: "Warriors",
    logo: undefined,
    score: 0,
    fouls: 0,
    selectedPlayer: DEFAULT_PLAYERS_B[0],
    players: DEFAULT_PLAYERS_B,
  },
  history: [],
  arrow: "A",
  controlMode: "buttons",
  period: 1,
  clockSeconds: START_CLOCK_SECONDS,
  shotClockSeconds: START_SHOT_CLOCK_SECONDS,
  clockRunning: false,
});

function getInitialState(storageKey: string): ScoreboardState {
  try {
    const rawState = localStorage.getItem(storageKey);

    if (!rawState) {
      return createInitialState();
    }

    const parsedState = JSON.parse(rawState) as ScoreboardState;

    return {
      ...createInitialState(),
      ...parsedState,
      clockRunning: false,
    };
  } catch (error) {
    console.error("No se pudo leer el estado del marcador:", error);
    return createInitialState();
  }
}

function formatClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatShotClock(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  return String(safeSeconds).padStart(2, "0");
}

function createHistoryId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
function getElapsedSeconds(clockSeconds: number) {
  return Math.max(0, START_CLOCK_SECONDS - clockSeconds);
}

function getTeamField(team: ScoreboardTeamKey) {
  return team === "A" ? "teamA" : "teamB";
}

function getPointEventType(points: number) {
  if (points === 1) return "POINT_1";
  if (points === 2) return "POINT_2";
  return "POINT_3";
}
type UseScoreboardParams = {
  matchId?: number;
};

export function useScoreboard({ matchId }: UseScoreboardParams = {}) {
  const storageKey = matchId
    ? `${BASE_STORAGE_KEY}.${matchId}`
    : BASE_STORAGE_KEY;
  const [state, setState] = useState<ScoreboardState>(() =>
    getInitialState(storageKey),
  );
  const intervalRef = useRef<number | null>(null);

  const clearClockInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const selectPlayer = useCallback(
    (team: ScoreboardTeamKey, player: string) => {
      setState((current) => {
        const teamField = getTeamField(team);

        return {
          ...current,
          [teamField]: {
            ...current[teamField],
            selectedPlayer: player,
          },
        };
      });
    },
    [],
  );

  const addHistoryEvent = useCallback(
    (
      event: Omit<
        ScoreboardHistoryEvent,
        "id" | "createdAt" | "period" | "elapsedSeconds" | "eventOrder"
      >,
    ) => {
      setState((current) => ({
        ...current,
        history: [
          ...current.history,
          {
            ...event,
            id: createHistoryId(),
            period: current.period,
            elapsedSeconds: getElapsedSeconds(current.clockSeconds),
            eventOrder: current.history.length + 1,
            createdAt: Date.now(),
          },
        ],
      }));
    },
    [],
  );

  const addPoints = useCallback((points: number, team: ScoreboardTeamKey) => {
    setState((current) => {
      const teamField = getTeamField(team);
      const selectedPlayer = current[teamField].selectedPlayer;

      if (!selectedPlayer) return current;

      const event: ScoreboardHistoryEvent = {
        id: createHistoryId(),
        type: getPointEventType(points),
        team,
        player: selectedPlayer,
        points,
        text: `${selectedPlayer} +${points}`,
        period: current.period,
        elapsedSeconds: getElapsedSeconds(current.clockSeconds),
        eventOrder: current.history.length + 1,
        createdAt: Date.now(),
      };

      return {
        ...current,
        [teamField]: {
          ...current[teamField],
          score: current[teamField].score + points,
        },
        history: [...current.history, event],
      };
    });
  }, []);

  const assist = useCallback((team: ScoreboardTeamKey) => {
    const teamField = getTeamField(team);

    setState((current) => {
      const selectedPlayer = current[teamField].selectedPlayer;
      if (!selectedPlayer) return current;

      return {
        ...current,
        history: [
          ...current.history,
          {
            id: createHistoryId(),
            type: "ASSIST",
            team,
            player: selectedPlayer,
            text: `${selectedPlayer} asistencia`,
            period: current.period,
            elapsedSeconds: getElapsedSeconds(current.clockSeconds),
            eventOrder: current.history.length + 1,
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const miss = useCallback((team: ScoreboardTeamKey) => {
    const teamField = getTeamField(team);

    setState((current) => {
      const selectedPlayer = current[teamField].selectedPlayer;
      if (!selectedPlayer) return current;

      return {
        ...current,
        history: [
          ...current.history,
          {
            id: createHistoryId(),
            type: "MISSED_SHOT",
            team,
            player: selectedPlayer,
            text: `${selectedPlayer} fallo tiro`,
            period: current.period,
            elapsedSeconds: getElapsedSeconds(current.clockSeconds),
            eventOrder: current.history.length + 1,
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const rebound = useCallback((team: ScoreboardTeamKey) => {
    const teamField = getTeamField(team);

    setState((current) => {
      const selectedPlayer = current[teamField].selectedPlayer;
      if (!selectedPlayer) return current;

      return {
        ...current,
        history: [
          ...current.history,
          {
            id: createHistoryId(),
            type: "REBOUND",
            team,
            player: selectedPlayer,
            text: `${selectedPlayer} rebote`,
            period: current.period,
            elapsedSeconds: getElapsedSeconds(current.clockSeconds),
            eventOrder: current.history.length + 1,
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const foul = useCallback((team: ScoreboardTeamKey) => {
    const teamField = getTeamField(team);

    setState((current) => {
      const selectedPlayer = current[teamField].selectedPlayer;
      if (!selectedPlayer) return current;

      return {
        ...current,
        [teamField]: {
          ...current[teamField],
          fouls: current[teamField].fouls + 1,
        },
        history: [
          ...current.history,
          {
            id: createHistoryId(),
            type: "FOUL",
            team,
            player: selectedPlayer,
            text: `${selectedPlayer} falta`,
            period: current.period,
            elapsedSeconds: getElapsedSeconds(current.clockSeconds),
            eventOrder: current.history.length + 1,
            createdAt: Date.now(),
          },
        ],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setState((current) => {
      const last = current.history[current.history.length - 1];
      if (!last) return current;

      const teamField = getTeamField(last.team);

      let updatedTeam = current[teamField];

      if (
        last.type === "POINT_1" ||
        last.type === "POINT_2" ||
        last.type === "POINT_3"
      ) {
        updatedTeam = {
          ...updatedTeam,
          score: Math.max(0, updatedTeam.score - (last.points ?? 0)),
        };
      }

      if (last.type === "FOUL") {
        updatedTeam = {
          ...updatedTeam,
          fouls: Math.max(0, updatedTeam.fouls - 1),
        };
      }

      return {
        ...current,
        [teamField]: updatedTeam,
        history: current.history.slice(0, -1),
      };
    });
  }, []);

  const toggleClock = useCallback(() => {
    setState((current) => ({
      ...current,
      clockRunning: !current.clockRunning,
    }));
  }, []);

  const resetClock = useCallback(() => {
    clearClockInterval();

    setState((current) => ({
      ...current,
      clockRunning: false,
      clockSeconds: START_CLOCK_SECONDS,
      shotClockSeconds: START_SHOT_CLOCK_SECONDS,
    }));
  }, [clearClockInterval]);

  const resetShotClock24 = useCallback(() => {
    setState((current) => ({
      ...current,
      shotClockSeconds: START_SHOT_CLOCK_SECONDS,
    }));
  }, []);

  const setShotClock14 = useCallback(() => {
    setState((current) => ({
      ...current,
      shotClockSeconds: SHOT_CLOCK_RESET_SECONDS,
    }));
  }, []);

  const nextPeriod = useCallback(() => {
    setState((current) => ({
      ...current,
      period: current.period >= 4 ? 1 : current.period + 1,
      shotClockSeconds: START_SHOT_CLOCK_SECONDS,
    }));
  }, []);

  const toggleArrow = useCallback(() => {
    setState((current) => ({
      ...current,
      arrow: current.arrow === "A" ? "B" : "A",
    }));
  }, []);

  const resetGame = useCallback(() => {
    clearClockInterval();

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("No se pudo limpiar el estado del marcador:", error);
    }

    setState(createInitialState());
  }, [clearClockInterval]);

  useEffect(() => {
    if (!state.clockRunning) {
      clearClockInterval();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      setState((current) => {
        if (!current.clockRunning) return current;

        const nextClockSeconds = Math.max(0, current.clockSeconds - 1);
        const nextShotClockSeconds = Math.max(0, current.shotClockSeconds - 1);
        const shouldStop = nextClockSeconds <= 0;

        return {
          ...current,
          clockSeconds: nextClockSeconds,
          shotClockSeconds: nextShotClockSeconds,
          clockRunning: shouldStop ? false : current.clockRunning,
        };
      });
    }, CLOCK_TICK_MS * 10);

    return () => {
      clearClockInterval();
    };
  }, [state.clockRunning, clearClockInterval]);

  const formattedClock = useMemo(
    () => formatClock(state.clockSeconds),
    [state.clockSeconds],
  );
  const formattedShotClock = useMemo(
    () => formatShotClock(state.shotClockSeconds),
    [state.shotClockSeconds],
  );

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      console.error("No se pudo guardar el estado del marcador:", error);
    }

    void syncScoreboardState(state, matchId);
  }, [state, storageKey, matchId]);

  useEffect(() => {
    const lastEvent = state.history[state.history.length - 1];

    if (!lastEvent) return;

    void saveMatchEvent(lastEvent, matchId);
  }, [state.history, matchId]);

  return {
    state,
    formattedClock,
    formattedShotClock,
    selectPlayer,
    addHistoryEvent,
    addPoints,
    assist,
    miss,
    rebound,
    foul,
    undo,
    toggleClock,
    resetClock,
    resetShotClock24,
    setShotClock14,
    nextPeriod,
    toggleArrow,
    resetGame,
  };
}
