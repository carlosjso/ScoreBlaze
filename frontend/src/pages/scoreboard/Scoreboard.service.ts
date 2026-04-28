import type {
  ScoreboardHistoryEvent,
  ScoreboardState,
} from "@/pages/scoreboard/Scoreboard.types";

export type SaveMatchEventPayload = {
  matchId?: number;
  teamKey: "A" | "B";
  playerLabel: string;
  eventType: ScoreboardHistoryEvent["type"];
  points?: number;
  period: number;
  elapsedSeconds: number;
  eventOrder: number;
  status: "active" | "undone";
  text: string;
};

export type SyncScoreboardStatePayload = {
  matchId?: number;
  state: ScoreboardState;
};

export function mapHistoryEventToPayload(
  event: ScoreboardHistoryEvent,
  matchId?: number,
): SaveMatchEventPayload {
  return {
    matchId,
    teamKey: event.team,
    playerLabel: event.player,
    eventType: event.type,
    points: event.points,
    period: event.period,
    elapsedSeconds: event.elapsedSeconds,
    eventOrder: event.eventOrder,
    status: "active",
    text: event.text,
  };
}

export async function saveMatchEvent(
  event: ScoreboardHistoryEvent,
  matchId?: number,
) {
  const payload = mapHistoryEventToPayload(event, matchId);

  console.log("[scoreboard] Evento listo para backend:", payload);

  return payload;
}

export async function syncScoreboardState(
  state: ScoreboardState,
  matchId?: number,
) {
  const payload: SyncScoreboardStatePayload = {
    matchId,
    state,
  };

  console.log("[scoreboard] Estado listo para sincronizar:", payload);

  return payload;
}

export async function finishMatch(state: ScoreboardState, matchId?: number) {
  const payload = {
    matchId,
    finalScore: {
      teamA: state.teamA.score,
      teamB: state.teamB.score,
    },
    fouls: {
      teamA: state.teamA.fouls,
      teamB: state.teamB.fouls,
    },
    period: state.period,
    events: state.history.map((event) => mapHistoryEventToPayload(event, matchId)),
  };

  console.log("[scoreboard] Partido listo para finalizar:", payload);

  return payload;
}