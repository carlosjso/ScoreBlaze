import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import { LiveCenterPanel } from "@/pages/scoreboard/components/live/LiveCenterPanel";
import { LiveClockBar } from "@/pages/scoreboard/components/live/LiveClockBar";
import { LiveFooterStats } from "@/pages/scoreboard/components/live/LiveFooterStats";
import { LiveMetaBar } from "@/pages/scoreboard/components/live/LiveMetaBar";
import { LiveTeamCard } from "@/pages/scoreboard/components/live/LiveTeamCard";
import {
  buildScoreboardWebSocketUrl,
  parseScoreboardRealtimeMessage,
} from "@/pages/scoreboard/ScoreboardRealtime.service";
import { getScoreboardSnapshot } from "@/pages/scoreboard/Scoreboard.service";
import type { ScoreboardState } from "@/pages/scoreboard/Scoreboard.types";

function createFallbackPlayers(team: "A" | "B") {
  return Array.from({ length: 5 }, (_, index) => {
    const label = `${team}${index + 1}`;

    return {
      key: `live:${team}:${index + 1}`,
      playerId: null,
      label,
      name: label,
      shirtNumber: null,
    };
  });
}

function createFallbackState(): ScoreboardState {
  return {
    teamA: {
      key: "A",
      name: "Frailes",
      logo: undefined,
      score: 0,
      fouls: 0,
      selectedPlayer: "live:A:1",
      players: createFallbackPlayers("A"),
    },
    teamB: {
      key: "B",
      name: "Warriors",
      logo: undefined,
      score: 0,
      fouls: 0,
      selectedPlayer: "live:B:1",
      players: createFallbackPlayers("B"),
    },
    history: [],
    arrow: "A",
    controlMode: "buttons",
    period: 1,
    clockSeconds: 600,
    shotClockSeconds: 24,
    clockRunning: false,
  };
}

function readStoredState(storageKey: string): ScoreboardState {
  try {
    const rawState = localStorage.getItem(storageKey);

    if (!rawState) {
      return createFallbackState();
    }

    return {
      ...createFallbackState(),
      ...JSON.parse(rawState),
    };
  } catch (error) {
    console.error("No se pudo leer el estado local del marcador visual:", error);
    return createFallbackState();
  }
}

function persistStoredState(storageKey: string, state: ScoreboardState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error("No se pudo guardar el estado local del marcador visual:", error);
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

function getLastEventText(state: ScoreboardState) {
  const lastEvent = state.history[state.history.length - 1];
  return lastEvent?.text ?? "SIN JUGADAS RECIENTES";
}

export default function LiveScoreboard() {
  const { matchId } = useParams<{ matchId: string }>();
  const numericMatchId = matchId ? Number(matchId) : undefined;
  const storageKey = numericMatchId
    ? `scoreboard.state.v1.${numericMatchId}`
    : "scoreboard.state.v1";

  const [state, setState] = useState<ScoreboardState>(() =>
    readStoredState(storageKey),
  );
  const hasReceivedRealtimeStateRef = useRef(false);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    hasReceivedRealtimeStateRef.current = false;
    setState(readStoredState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (!numericMatchId) {
      return;
    }

    const abortController = new AbortController();

    void getScoreboardSnapshot(numericMatchId, abortController.signal)
      .then((snapshotState) => {
        if (hasReceivedRealtimeStateRef.current) {
          return;
        }

        setState(snapshotState);
        persistStoredState(storageKey, snapshotState);
      })
      .catch((error) => {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("No se pudo cargar el snapshot inicial del marcador live:", error);
      });

    return () => {
      abortController.abort();
    };
  }, [numericMatchId, storageKey]);

  useEffect(() => {
    if (!numericMatchId) {
      return;
    }

    let cancelled = false;
    let socket: WebSocket | null = null;

    const clearReconnectTimeout = () => {
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    const connect = () => {
      if (cancelled) {
        return;
      }

      socket = new WebSocket(buildScoreboardWebSocketUrl(numericMatchId, "live"));

      socket.onmessage = (event) => {
        const nextState = parseScoreboardRealtimeMessage(event.data);
        if (!nextState) {
          return;
        }

        hasReceivedRealtimeStateRef.current = true;
        setState(nextState);
        persistStoredState(storageKey, nextState);
      };

      socket.onerror = () => {
        console.error("Fallo la conexion realtime de la pantalla live.");
      };

      socket.onclose = () => {
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
      socket?.close();
    };
  }, [numericMatchId, storageKey]);

  const clockText = useMemo(
    () => formatClock(state.clockSeconds),
    [state.clockSeconds],
  );
  const shotClockText = useMemo(
    () => formatShotClock(state.shotClockSeconds),
    [state.shotClockSeconds],
  );
  const lastEventText = useMemo(() => getLastEventText(state), [state]);
  const arrowToA = state.arrow === "A";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.06),transparent_22%),linear-gradient(145deg,#f6f7f9,#eceff4)] p-2 text-slate-800 sm:p-3">
      <section className="mx-auto grid min-h-[calc(100vh-28px)] w-full max-w-[1500px] grid-rows-[auto_auto_1fr_auto] gap-5 rounded-[30px] border border-slate-200 bg-white/85 p-5 shadow-[0_10px_30px_rgba(17,24,39,0.08)]">
        <LiveClockBar clockText={clockText} shotClockText={shotClockText} />

        <LiveMetaBar period={state.period} lastEventText={lastEventText} />

        <div className="grid items-stretch gap-5 lg:grid-cols-[1fr_240px_1fr]">
          <LiveTeamCard team={state.teamA} hasPossession={arrowToA} />

          <LiveCenterPanel arrowToA={arrowToA} arrow={state.arrow} />

          <LiveTeamCard team={state.teamB} hasPossession={!arrowToA} />
        </div>

        <LiveFooterStats teamA={state.teamA} teamB={state.teamB} />
      </section>
    </main>
  );
}
