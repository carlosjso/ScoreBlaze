import { useEffect, useMemo, useState } from "react";

import {
  buildScoreboardWebSocketUrl,
  parseScoreboardRealtimeMessage,
} from "@/features/scoreboard/ScoreboardRealtime.service";
import type { ScoreboardState } from "@/features/scoreboard/Scoreboard.types";

const SCOREBOARD_REALTIME_RECONNECT_MS = 1500;

type RealtimeScoreboardsState = Record<number, ScoreboardState>;

export function useRealtimeScoreboards(matchIds: number[]) {
  const matchIdsKey = useMemo(
    () =>
      [...new Set(matchIds.filter((matchId) => Number.isFinite(matchId)))]
        .map((matchId) => Math.trunc(matchId))
        .sort((left, right) => left - right)
        .join(","),
    [matchIds],
  );
  const normalizedMatchIds = useMemo(
    () =>
      matchIdsKey
        ? matchIdsKey.split(",").map((matchId) => Number(matchId))
        : [],
    [matchIdsKey],
  );
  const [statesByMatchId, setStatesByMatchId] = useState<RealtimeScoreboardsState>({});

  useEffect(() => {
    setStatesByMatchId((current) => {
      if (normalizedMatchIds.length === 0) {
        return {};
      }

      const nextEntries = normalizedMatchIds.flatMap((matchId) =>
        current[matchId] ? [[matchId, current[matchId]] as const] : [],
      );

      return Object.fromEntries(nextEntries);
    });
  }, [matchIdsKey, normalizedMatchIds]);

  useEffect(() => {
    if (normalizedMatchIds.length === 0) {
      return;
    }

    let cancelled = false;
    const sockets = new Map<number, WebSocket>();
    const reconnectTimeouts = new Map<number, number>();

    const clearReconnectTimeout = (matchId: number) => {
      const timeoutId = reconnectTimeouts.get(matchId);
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
        reconnectTimeouts.delete(matchId);
      }
    };

    const connect = (matchId: number) => {
      if (cancelled) {
        return;
      }

      const socket = new WebSocket(buildScoreboardWebSocketUrl(matchId, "live"));
      sockets.set(matchId, socket);

      socket.onmessage = (event) => {
        const nextState = parseScoreboardRealtimeMessage(event.data);
        if (!nextState) {
          return;
        }

        setStatesByMatchId((current) => ({
          ...current,
          [matchId]: nextState,
        }));
      };

      socket.onclose = () => {
        sockets.delete(matchId);
        if (cancelled) {
          return;
        }

        clearReconnectTimeout(matchId);
        reconnectTimeouts.set(
          matchId,
          window.setTimeout(() => {
            connect(matchId);
          }, SCOREBOARD_REALTIME_RECONNECT_MS),
        );
      };
    };

    normalizedMatchIds.forEach((matchId) => {
      connect(matchId);
    });

    return () => {
      cancelled = true;
      reconnectTimeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
      sockets.forEach((socket) => socket.close());
    };
  }, [matchIdsKey, normalizedMatchIds]);

  return statesByMatchId;
}
