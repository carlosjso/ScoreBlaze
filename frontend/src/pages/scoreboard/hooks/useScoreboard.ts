import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getScoreboardSnapshot,
  resetMatchScoreboard,
  saveMatchEvent,
  undoMatchEvent,
} from "@/pages/scoreboard/Scoreboard.service";
import {
  buildScoreboardWebSocketUrl,
  createScoreboardRealtimeMessage,
} from "@/pages/scoreboard/ScoreboardRealtime.service";

import type {
  ScoreboardHistoryEvent,
  ScoreboardPlayerOption,
  ScoreboardState,
  ScoreboardTeamKey,
  ScoreboardTeamState,
} from "@/pages/scoreboard/Scoreboard.types";

const START_CLOCK_SECONDS = 10 * 60;
const START_SHOT_CLOCK_SECONDS = 24;
const SHOT_CLOCK_RESET_SECONDS = 14;
const CLOCK_TICK_MS = 1000;

const BASE_STORAGE_KEY = "scoreboard.state.v1";

const DEFAULT_PLAYERS_A = createGuestPlayers("A");
const DEFAULT_PLAYERS_B = createGuestPlayers("B");

type MatchSetup = {
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamBName: string;
  scoreTeamA: number | null;
  scoreTeamB: number | null;
};

type UseScoreboardParams = {
  matchId?: number;
  matchSetup?: MatchSetup | null;
};

function createGuestPlayers(team: ScoreboardTeamKey): ScoreboardPlayerOption[] {
  return Array.from({ length: 5 }, (_, index) => {
    const label = `${team}${index + 1}`;

    return {
      key: `guest:${team}:${index + 1}`,
      playerId: null,
      label,
      name: label,
      shirtNumber: null,
    };
  });
}

function buildTeamState(
  key: ScoreboardTeamKey,
  name: string,
  score = 0,
  options?: {
    id?: number;
    logo?: string;
    fouls?: number;
    players?: ScoreboardPlayerOption[];
    selectedPlayer?: string | null;
  },
): ScoreboardTeamState {
  const players = options?.players?.length
    ? options.players
    : key === "A"
      ? DEFAULT_PLAYERS_A
      : DEFAULT_PLAYERS_B;
  const selectedPlayer = resolveSelectedPlayer(options?.selectedPlayer ?? null, players);

  return {
    id: options?.id,
    key,
    name,
    logo: options?.logo,
    score,
    fouls: options?.fouls ?? 0,
    selectedPlayer,
    players,
  };
}

const createInitialState = (matchSetup?: MatchSetup | null): ScoreboardState => ({
  teamA: buildTeamState(
    "A",
    matchSetup?.teamAName ?? "Frailes",
    matchSetup?.scoreTeamA ?? 0,
    { id: matchSetup?.teamAId },
  ),
  teamB: buildTeamState(
    "B",
    matchSetup?.teamBName ?? "Warriors",
    matchSetup?.scoreTeamB ?? 0,
    { id: matchSetup?.teamBId },
  ),
  history: [],
  arrow: "A",
  controlMode: "buttons",
  period: 1,
  clockSeconds: START_CLOCK_SECONDS,
  shotClockSeconds: START_SHOT_CLOCK_SECONDS,
  clockRunning: false,
});

function getInitialState(storageKey: string, matchSetup?: MatchSetup | null): ScoreboardState {
  try {
    const rawState = localStorage.getItem(storageKey);

    if (!rawState) {
      return createInitialState(matchSetup);
    }

    const parsedState = JSON.parse(rawState) as Partial<ScoreboardState>;
    return normalizeStoredState(parsedState, matchSetup);
  } catch (error) {
    console.error("No se pudo leer el estado del marcador:", error);
    return createInitialState(matchSetup);
  }
}

function normalizeStoredPlayers(
  team: ScoreboardTeamKey,
  players: unknown,
): ScoreboardPlayerOption[] {
  if (!Array.isArray(players) || players.length === 0) {
    return team === "A" ? DEFAULT_PLAYERS_A : DEFAULT_PLAYERS_B;
  }

  if (typeof players[0] === "string") {
    return (players as string[]).map((player, index) => ({
      key: `legacy:${team}:${index}:${player}`,
      playerId: null,
      label: player,
      name: player,
      shirtNumber: null,
    }));
  }

  return (players as ScoreboardPlayerOption[]).map((player, index) => ({
    key: typeof player.key === "string" && player.key.trim()
      ? player.key
      : player.playerId !== null && player.playerId !== undefined
        ? `player:${player.playerId}`
        : `guest:${team}:${index}`,
    playerId: typeof player.playerId === "number" ? player.playerId : null,
    label: player.label || player.name || `${team}${index + 1}`,
    name: player.name || player.label || `${team}${index + 1}`,
    shirtNumber: player.shirtNumber ?? null,
  }));
}

function normalizeStoredHistory(history: unknown): ScoreboardHistoryEvent[] {
  if (!Array.isArray(history)) {
    return [];
  }

  const normalizedHistory: ScoreboardHistoryEvent[] = [];

  history.forEach((event, index) => {
    const candidate = event as Partial<ScoreboardHistoryEvent>;

    if (!candidate || (candidate.team !== "A" && candidate.team !== "B")) {
      return;
    }

    normalizedHistory.push({
      id: typeof candidate.id === "string" ? candidate.id : createHistoryId(),
      type: candidate.type ?? "MISSED_SHOT",
      team: candidate.team,
      teamId: typeof candidate.teamId === "number" ? candidate.teamId : undefined,
      player: candidate.player ?? "Invitado",
      playerId: typeof candidate.playerId === "number" ? candidate.playerId : null,
      points: candidate.points,
      text: candidate.text ?? candidate.player ?? "Evento",
      period: typeof candidate.period === "number" ? candidate.period : 1,
      elapsedSeconds:
        typeof candidate.elapsedSeconds === "number" ? candidate.elapsedSeconds : 0,
      eventOrder:
        typeof candidate.eventOrder === "number" ? candidate.eventOrder : index + 1,
      createdAt:
        typeof candidate.createdAt === "number" ? candidate.createdAt : Date.now(),
      backendEventId:
        typeof candidate.backendEventId === "number"
          ? candidate.backendEventId
          : undefined,
      status: candidate.status === "voided" ? "voided" : "active",
    });
  });

  return normalizedHistory;
}

function normalizeStoredState(
  parsedState: Partial<ScoreboardState>,
  matchSetup?: MatchSetup | null,
): ScoreboardState {
  const fallback = createInitialState(matchSetup);
  const teamAPlayers = normalizeStoredPlayers("A", parsedState.teamA?.players);
  const teamBPlayers = normalizeStoredPlayers("B", parsedState.teamB?.players);

  return {
    teamA: buildTeamState(
      "A",
      parsedState.teamA?.name ?? fallback.teamA.name,
      parsedState.teamA?.score ?? fallback.teamA.score,
      {
        id: parsedState.teamA?.id ?? fallback.teamA.id,
        logo: parsedState.teamA?.logo ?? fallback.teamA.logo,
        fouls: parsedState.teamA?.fouls ?? fallback.teamA.fouls,
        players: teamAPlayers,
        selectedPlayer: parsedState.teamA?.selectedPlayer ?? fallback.teamA.selectedPlayer,
      },
    ),
    teamB: buildTeamState(
      "B",
      parsedState.teamB?.name ?? fallback.teamB.name,
      parsedState.teamB?.score ?? fallback.teamB.score,
      {
        id: parsedState.teamB?.id ?? fallback.teamB.id,
        logo: parsedState.teamB?.logo ?? fallback.teamB.logo,
        fouls: parsedState.teamB?.fouls ?? fallback.teamB.fouls,
        players: teamBPlayers,
        selectedPlayer: parsedState.teamB?.selectedPlayer ?? fallback.teamB.selectedPlayer,
      },
    ),
    history: normalizeStoredHistory(parsedState.history),
    arrow: parsedState.arrow === "B" ? "B" : "A",
    controlMode: parsedState.controlMode === "keyboard" ? "keyboard" : "buttons",
    period: typeof parsedState.period === "number" ? parsedState.period : fallback.period,
    clockSeconds:
      typeof parsedState.clockSeconds === "number"
        ? parsedState.clockSeconds
        : fallback.clockSeconds,
    shotClockSeconds:
      typeof parsedState.shotClockSeconds === "number"
        ? parsedState.shotClockSeconds
        : fallback.shotClockSeconds,
    clockRunning: false,
  };
}

function resolveSelectedPlayer(
  selectedPlayer: string | null,
  players: ScoreboardPlayerOption[],
): string | null {
  if (!players.length) {
    return null;
  }

  if (!selectedPlayer) {
    return players[0].key;
  }

  const exactMatch = players.find((player) => player.key === selectedPlayer);
  if (exactMatch) {
    return exactMatch.key;
  }

  const legacyMatch = players.find((player) => player.label === selectedPlayer);
  return legacyMatch?.key ?? players[0].key;
}

function mergeServerState(
  current: ScoreboardState,
  serverState: ScoreboardState,
): ScoreboardState {
  const mergedTeamA = {
    ...serverState.teamA,
    selectedPlayer: resolveSelectedPlayer(
      current.teamA.selectedPlayer,
      serverState.teamA.players,
    ),
  };
  const mergedTeamB = {
    ...serverState.teamB,
    selectedPlayer: resolveSelectedPlayer(
      current.teamB.selectedPlayer,
      serverState.teamB.players,
    ),
  };

  return {
    ...serverState,
    teamA: mergedTeamA,
    teamB: mergedTeamB,
    arrow: current.arrow,
    controlMode: current.controlMode,
    period: current.period,
    clockSeconds: current.clockSeconds,
    shotClockSeconds: current.shotClockSeconds,
    clockRunning: current.clockRunning,
  };
}

function applyMatchSetupToState(
  current: ScoreboardState,
  matchSetup: MatchSetup,
): ScoreboardState {
  return {
    ...current,
    teamA: {
      ...current.teamA,
      id: matchSetup.teamAId,
      name: matchSetup.teamAName,
      score: current.history.length ? current.teamA.score : matchSetup.scoreTeamA ?? 0,
    },
    teamB: {
      ...current.teamB,
      id: matchSetup.teamBId,
      name: matchSetup.teamBName,
      score: current.history.length ? current.teamB.score : matchSetup.scoreTeamB ?? 0,
    },
  };
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

function getSelectedPlayerOption(team: ScoreboardTeamState) {
  return team.players.find((player) => player.key === team.selectedPlayer) ?? null;
}

function createEventText(
  playerLabel: string,
  type: ScoreboardHistoryEvent["type"],
  points?: number,
) {
  if (type === "POINT_1" || type === "POINT_2" || type === "POINT_3") {
    return `${playerLabel} +${points ?? 0}`;
  }

  if (type === "ASSIST") return `${playerLabel} asistencia`;
  if (type === "MISSED_SHOT") return `${playerLabel} fallo tiro`;
  if (type === "REBOUND") return `${playerLabel} rebote`;
  return `${playerLabel} falta`;
}

export function useScoreboard({
  matchId,
  matchSetup,
}: UseScoreboardParams = {}) {
  const storageKey = matchId
    ? `${BASE_STORAGE_KEY}.${matchId}`
    : BASE_STORAGE_KEY;
  const [state, setState] = useState<ScoreboardState>(() =>
    getInitialState(storageKey, matchSetup),
  );
  const [loading, setLoading] = useState(Boolean(matchId));
  const [syncError, setSyncError] = useState<string | null>(null);

  const intervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const mutationQueueRef = useRef(Promise.resolve<void>(undefined));
  const realtimeSocketRef = useRef<WebSocket | null>(null);
  const pendingRealtimeStateRef = useRef<ScoreboardState | null>(null);
  const hasLoadedSnapshotRef = useRef(false);
  const hasAppliedMatchSetupRef = useRef(false);
  const lastMatchIdRef = useRef(matchId);

  const commitState = useCallback((nextState: ScoreboardState) => {
    stateRef.current = nextState;
    setState(nextState);
    return nextState;
  }, []);

  const updateState = useCallback(
    (updater: (current: ScoreboardState) => ScoreboardState) => {
      const nextState = updater(stateRef.current);
      return commitState(nextState);
    },
    [commitState],
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearClockInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current !== null) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const broadcastRealtimeState = useCallback((nextState: ScoreboardState) => {
    pendingRealtimeStateRef.current = nextState;

    const socket = realtimeSocketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(createScoreboardRealtimeMessage(nextState));
    pendingRealtimeStateRef.current = null;
  }, []);

  useEffect(() => {
    if (lastMatchIdRef.current === matchId) {
      return;
    }

    lastMatchIdRef.current = matchId;
    hasLoadedSnapshotRef.current = false;
    hasAppliedMatchSetupRef.current = false;
    mutationQueueRef.current = Promise.resolve<void>(undefined);
    pendingRealtimeStateRef.current = null;
    clearClockInterval();
    clearReconnectTimeout();
    commitState(getInitialState(storageKey, matchSetup));
    setSyncError(null);
    setLoading(Boolean(matchId));
  }, [
    clearClockInterval,
    clearReconnectTimeout,
    commitState,
    matchId,
    matchSetup,
    storageKey,
  ]);

  useEffect(() => {
    if (
      !matchSetup ||
      hasLoadedSnapshotRef.current ||
      hasAppliedMatchSetupRef.current
    ) {
      return;
    }

    hasAppliedMatchSetupRef.current = true;
    updateState((current) => applyMatchSetupToState(current, matchSetup));
  }, [matchSetup, updateState]);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setSyncError(null);

    void getScoreboardSnapshot(matchId, abortController.signal)
      .then((serverState) => {
        hasLoadedSnapshotRef.current = true;
        commitState(mergeServerState(stateRef.current, serverState));
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "No se pudo cargar el marcador del backend.";
        setSyncError(message);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      });

    return () => {
      abortController.abort();
    };
  }, [matchId, commitState]);

  useEffect(() => {
    if (!matchId) {
      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
      clearReconnectTimeout();
      return;
    }

    let cancelled = false;

    const connect = () => {
      if (cancelled) {
        return;
      }

      const socket = new WebSocket(
        buildScoreboardWebSocketUrl(matchId, "control"),
      );
      realtimeSocketRef.current = socket;

      socket.onopen = () => {
        const latestState = pendingRealtimeStateRef.current ?? stateRef.current;
        if (!latestState) {
          return;
        }

        socket.send(createScoreboardRealtimeMessage(latestState));
        pendingRealtimeStateRef.current = null;
      };

      socket.onerror = () => {
        console.error("Fallo la conexion realtime del marcador.");
      };

      socket.onclose = () => {
        if (realtimeSocketRef.current === socket) {
          realtimeSocketRef.current = null;
        }

        if (cancelled) {
          return;
        }

        clearReconnectTimeout();
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 1500);
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearReconnectTimeout();

      if (realtimeSocketRef.current) {
        realtimeSocketRef.current.close();
        realtimeSocketRef.current = null;
      }
    };
  }, [clearReconnectTimeout, matchId]);

  const enqueueServerSync = useCallback(
    (task: () => Promise<ScoreboardState | null>) => {
      const queuedMatchId = lastMatchIdRef.current;

      mutationQueueRef.current = mutationQueueRef.current
        .catch(() => undefined)
        .then(async () => {
          try {
            const serverState = await task();
            if (!serverState || lastMatchIdRef.current !== queuedMatchId) {
              return;
            }

            commitState(mergeServerState(stateRef.current, serverState));
            setSyncError(null);
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "No se pudo sincronizar el marcador con el backend.";
            setSyncError(message);
          }
        });
    },
    [commitState],
  );

  const selectPlayer = useCallback(
    (team: ScoreboardTeamKey, player: string) => {
      updateState((current) => {
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
    [updateState],
  );

  const appendEvent = useCallback(
    (team: ScoreboardTeamKey, type: ScoreboardHistoryEvent["type"], points?: number) => {
      const current = stateRef.current;
      const teamField = getTeamField(team);
      const teamState = current[teamField];
      const selectedPlayer = getSelectedPlayerOption(teamState);

      if (!selectedPlayer) {
        return null;
      }

      const event: ScoreboardHistoryEvent = {
        id: createHistoryId(),
        type,
        team,
        teamId: teamState.id,
        player: selectedPlayer.label,
        playerId: selectedPlayer.playerId,
        points,
        text: createEventText(selectedPlayer.label, type, points),
        period: current.period,
        elapsedSeconds: getElapsedSeconds(current.clockSeconds),
        eventOrder: current.history.length + 1,
        createdAt: Date.now(),
        status: "active",
      };

      const nextState: ScoreboardState = {
        ...current,
        [teamField]: {
          ...teamState,
          score:
            type === "POINT_1" || type === "POINT_2" || type === "POINT_3"
              ? teamState.score + (points ?? 0)
              : teamState.score,
          fouls: type === "FOUL" ? teamState.fouls + 1 : teamState.fouls,
        },
        history: [...current.history, event],
      };

      commitState(nextState);
      return event;
    },
    [commitState],
  );

  const addHistoryEvent = useCallback(
    (
      event: Omit<
        ScoreboardHistoryEvent,
        "id" | "createdAt" | "period" | "elapsedSeconds" | "eventOrder"
      >,
    ) => {
      const current = stateRef.current;
      const nextEvent: ScoreboardHistoryEvent = {
        ...event,
        id: createHistoryId(),
        period: current.period,
        elapsedSeconds: getElapsedSeconds(current.clockSeconds),
        eventOrder: current.history.length + 1,
        createdAt: Date.now(),
      };

      commitState({
        ...current,
        history: [...current.history, nextEvent],
      });
    },
    [commitState],
  );

  const addPoints = useCallback(
    (points: number, team: ScoreboardTeamKey) => {
      const event = appendEvent(team, getPointEventType(points), points);
      if (event && matchId) {
        enqueueServerSync(() => saveMatchEvent(event, matchId));
      }
    },
    [appendEvent, enqueueServerSync, matchId],
  );

  const assist = useCallback(
    (team: ScoreboardTeamKey) => {
      const event = appendEvent(team, "ASSIST");
      if (event && matchId) {
        enqueueServerSync(() => saveMatchEvent(event, matchId));
      }
    },
    [appendEvent, enqueueServerSync, matchId],
  );

  const miss = useCallback(
    (team: ScoreboardTeamKey) => {
      const event = appendEvent(team, "MISSED_SHOT");
      if (event && matchId) {
        enqueueServerSync(() => saveMatchEvent(event, matchId));
      }
    },
    [appendEvent, enqueueServerSync, matchId],
  );

  const rebound = useCallback(
    (team: ScoreboardTeamKey) => {
      const event = appendEvent(team, "REBOUND");
      if (event && matchId) {
        enqueueServerSync(() => saveMatchEvent(event, matchId));
      }
    },
    [appendEvent, enqueueServerSync, matchId],
  );

  const foul = useCallback(
    (team: ScoreboardTeamKey) => {
      const event = appendEvent(team, "FOUL");
      if (event && matchId) {
        enqueueServerSync(() => saveMatchEvent(event, matchId));
      }
    },
    [appendEvent, enqueueServerSync, matchId],
  );

  const undo = useCallback(() => {
    const current = stateRef.current;
    const last = current.history[current.history.length - 1];
    if (!last) return;

    const teamField = getTeamField(last.team);
    const updatedTeam = {
      ...current[teamField],
      score:
        last.type === "POINT_1" || last.type === "POINT_2" || last.type === "POINT_3"
          ? Math.max(0, current[teamField].score - (last.points ?? 0))
          : current[teamField].score,
      fouls:
        last.type === "FOUL"
          ? Math.max(0, current[teamField].fouls - 1)
          : current[teamField].fouls,
    };

    commitState({
      ...current,
      [teamField]: updatedTeam,
      history: current.history.slice(0, -1),
    });

    if (matchId) {
      enqueueServerSync(() => undoMatchEvent(matchId));
    }
  }, [commitState, enqueueServerSync, matchId]);

  const toggleClock = useCallback(() => {
    updateState((current) => ({
      ...current,
      clockRunning: !current.clockRunning,
    }));
  }, [updateState]);

  const resetClock = useCallback(() => {
    clearClockInterval();

    updateState((current) => ({
      ...current,
      clockRunning: false,
      clockSeconds: START_CLOCK_SECONDS,
      shotClockSeconds: START_SHOT_CLOCK_SECONDS,
    }));
  }, [clearClockInterval, updateState]);

  const resetShotClock24 = useCallback(() => {
    updateState((current) => ({
      ...current,
      shotClockSeconds: START_SHOT_CLOCK_SECONDS,
    }));
  }, [updateState]);

  const setShotClock14 = useCallback(() => {
    updateState((current) => ({
      ...current,
      shotClockSeconds: SHOT_CLOCK_RESET_SECONDS,
    }));
  }, [updateState]);

  const nextPeriod = useCallback(() => {
    updateState((current) => ({
      ...current,
      period: current.period >= 4 ? 1 : current.period + 1,
      shotClockSeconds: START_SHOT_CLOCK_SECONDS,
    }));
  }, [updateState]);

  const toggleArrow = useCallback(() => {
    updateState((current) => ({
      ...current,
      arrow: current.arrow === "A" ? "B" : "A",
    }));
  }, [updateState]);

  const resetGame = useCallback(() => {
    clearClockInterval();

    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("No se pudo limpiar el estado del marcador:", error);
    }

    const current = stateRef.current;
    const nextState: ScoreboardState = {
      ...createInitialState(matchSetup),
      teamA: buildTeamState("A", current.teamA.name, 0, {
        id: current.teamA.id,
        logo: current.teamA.logo,
        players: current.teamA.players,
      }),
      teamB: buildTeamState("B", current.teamB.name, 0, {
        id: current.teamB.id,
        logo: current.teamB.logo,
        players: current.teamB.players,
      }),
    };

    commitState(nextState);

    if (matchId) {
      enqueueServerSync(() => resetMatchScoreboard(matchId));
    }
  }, [clearClockInterval, commitState, enqueueServerSync, matchId, matchSetup, storageKey]);

  useEffect(() => {
    if (!state.clockRunning) {
      clearClockInterval();
      return;
    }

    intervalRef.current = window.setInterval(() => {
      updateState((current) => {
        if (!current.clockRunning) {
          return current;
        }

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
    }, CLOCK_TICK_MS);

    return () => {
      clearClockInterval();
    };
  }, [state.clockRunning, clearClockInterval, updateState]);

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
  }, [state, storageKey]);

  useEffect(() => {
    if (!matchId) {
      return;
    }

    broadcastRealtimeState(state);
  }, [broadcastRealtimeState, matchId, state]);

  return {
    state,
    loading,
    syncError,
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
