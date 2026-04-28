import { z, type ZodType } from "zod";

import type { ApiMatch } from "@/pages/quick-matches/QuickMatches.types";
import { apiMatchSchema } from "@/pages/quick-matches/schemas/QuickMatches.schema";
import type {
  ScoreboardEventType,
  ScoreboardHistoryEvent,
  ScoreboardPlayerOption,
  ScoreboardState,
} from "@/pages/scoreboard/Scoreboard.types";
import { apiClient, getApiErrorMessage } from "@/shared/api/client";
import { getBase64ImageSrc } from "@/shared/utils/base64Image";

const idSchema = z.coerce.number().int();
const scoreboardTeamKeySchema = z.enum(["A", "B"]);
const scoreboardEventTypeSchema = z.enum([
  "point_1",
  "point_2",
  "point_3",
  "miss",
  "foul",
  "rebound",
  "assist",
]);
const scoreboardEventStatusSchema = z.enum(["active", "voided"]);
const dateTimeSchema = z.string().min(1);

type ApiScoreboardEventType = z.infer<typeof scoreboardEventTypeSchema>;
type ApiScoreboardEventStatus = z.infer<typeof scoreboardEventStatusSchema>;
type ApiScoreboardTeamKey = z.infer<typeof scoreboardTeamKeySchema>;

type ApiScoreboardPlayer = {
  id: number | null;
  name: string;
  shirt_number: string | null;
  label: string;
};

type ApiScoreboardTeam = {
  id: number;
  key: ApiScoreboardTeamKey;
  name: string;
  logo_base64: string | null;
  score: number;
  fouls: number;
  players: ApiScoreboardPlayer[];
};

type ApiScoreboardEvent = {
  id: number;
  team_key: ApiScoreboardTeamKey;
  team_id: number;
  player_id: number | null;
  guest_name: string | null;
  event_type: ApiScoreboardEventType;
  period: number;
  elapsed_seconds: number;
  event_order: number;
  status: ApiScoreboardEventStatus;
  created_at: string;
};

type ApiScoreboardSnapshot = {
  match: ApiMatch;
  team_a: ApiScoreboardTeam;
  team_b: ApiScoreboardTeam;
  events: ApiScoreboardEvent[];
};

const apiScoreboardPlayerSchema = z.object({
  id: idSchema.nullable(),
  name: z.string().trim().min(1),
  shirt_number: z.string().trim().nullable(),
  label: z.string().trim().min(1),
}) satisfies z.ZodType<ApiScoreboardPlayer>;

const apiScoreboardTeamSchema = z.object({
  id: idSchema,
  key: scoreboardTeamKeySchema,
  name: z.string().trim().min(1),
  logo_base64: z.string().nullable(),
  score: z.number().int().min(0),
  fouls: z.number().int().min(0),
  players: z.array(apiScoreboardPlayerSchema),
}) satisfies z.ZodType<ApiScoreboardTeam>;

const apiScoreboardEventSchema = z.object({
  id: idSchema,
  team_key: scoreboardTeamKeySchema,
  team_id: idSchema,
  player_id: idSchema.nullable(),
  guest_name: z.string().nullable(),
  event_type: scoreboardEventTypeSchema,
  period: z.number().int().min(1),
  elapsed_seconds: z.number().int().min(0),
  event_order: z.number().int().min(0),
  status: scoreboardEventStatusSchema,
  created_at: dateTimeSchema,
}) satisfies z.ZodType<ApiScoreboardEvent>;

const apiScoreboardSnapshotSchema = z.object({
  match: apiMatchSchema,
  team_a: apiScoreboardTeamSchema,
  team_b: apiScoreboardTeamSchema,
  events: z.array(apiScoreboardEventSchema),
}) satisfies z.ZodType<ApiScoreboardSnapshot>;

type ScoreboardEventMutationPayload = {
  team_key: ApiScoreboardTeamKey;
  player_id: number | null;
  guest_name: string | null;
  event_type: ApiScoreboardEventType;
  period: number;
  elapsed_seconds: number;
};

const FRONTEND_TO_API_EVENT_TYPE: Record<ScoreboardEventType, ApiScoreboardEventType> = {
  POINT_1: "point_1",
  POINT_2: "point_2",
  POINT_3: "point_3",
  MISSED_SHOT: "miss",
  FOUL: "foul",
  REBOUND: "rebound",
  ASSIST: "assist",
};

const API_TO_FRONTEND_EVENT_TYPE: Record<ApiScoreboardEventType, ScoreboardEventType> = {
  point_1: "POINT_1",
  point_2: "POINT_2",
  point_3: "POINT_3",
  miss: "MISSED_SHOT",
  foul: "FOUL",
  rebound: "REBOUND",
  assist: "ASSIST",
};

const DEFAULT_CLOCK_SECONDS = 10 * 60;
const DEFAULT_SHOT_CLOCK_SECONDS = 24;

async function requestJson<T>(
  request: Promise<{ data: unknown }>,
  schema: ZodType<T>,
  invalidMessage: string,
): Promise<T> {
  try {
    const response = await request;
    return schema.parse(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, invalidMessage));
  }
}

function toPlayerOption(player: ApiScoreboardPlayer): ScoreboardPlayerOption {
  const shirtNumber = player.shirt_number?.trim() || null;
  const fallbackKey = player.label.toLowerCase().replace(/\s+/g, "-");

  return {
    key: player.id !== null ? `player:${player.id}` : `guest:${fallbackKey}`,
    playerId: player.id,
    label: player.label,
    name: player.name,
    shirtNumber,
  };
}

function createFallbackPlayers(team: ApiScoreboardTeamKey): ScoreboardPlayerOption[] {
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

function getEventText(type: ScoreboardEventType, playerLabel: string, points?: number) {
  if (type === "POINT_1" || type === "POINT_2" || type === "POINT_3") {
    return `${playerLabel} +${points ?? 0}`;
  }

  if (type === "ASSIST") return `${playerLabel} asistencia`;
  if (type === "MISSED_SHOT") return `${playerLabel} fallo tiro`;
  if (type === "REBOUND") return `${playerLabel} rebote`;
  return `${playerLabel} falta`;
}

function getPointsFromApiEventType(eventType: ApiScoreboardEventType) {
  if (eventType === "point_1") return 1;
  if (eventType === "point_2") return 2;
  if (eventType === "point_3") return 3;
  return undefined;
}

function getPlayerLabelByEvent(
  event: ApiScoreboardEvent,
  playersById: Map<number, ScoreboardPlayerOption>,
) {
  if (event.player_id !== null) {
    return playersById.get(event.player_id)?.label ?? `Jugador #${event.player_id}`;
  }

  return event.guest_name?.trim() || "Invitado";
}

function getLatestPeriod(snapshot: ApiScoreboardSnapshot) {
  const lastEvent = snapshot.events[snapshot.events.length - 1];
  return lastEvent?.period ?? 1;
}

export function buildScoreboardState(snapshot: ApiScoreboardSnapshot): ScoreboardState {
  const teamAPlayers = snapshot.team_a.players.length
    ? snapshot.team_a.players.map(toPlayerOption)
    : createFallbackPlayers("A");
  const teamBPlayers = snapshot.team_b.players.length
    ? snapshot.team_b.players.map(toPlayerOption)
    : createFallbackPlayers("B");
  const playersById = new Map<number, ScoreboardPlayerOption>();

  for (const player of [...teamAPlayers, ...teamBPlayers]) {
    if (player.playerId !== null) {
      playersById.set(player.playerId, player);
    }
  }

  const history: ScoreboardHistoryEvent[] = snapshot.events.map((event) => {
    const type = API_TO_FRONTEND_EVENT_TYPE[event.event_type];
    const points = getPointsFromApiEventType(event.event_type);
    const playerLabel = getPlayerLabelByEvent(event, playersById);

    return {
      id: `backend-${event.id}`,
      backendEventId: event.id,
      type,
      team: event.team_key,
      teamId: event.team_id,
      player: playerLabel,
      playerId: event.player_id,
      points,
      text: getEventText(type, playerLabel, points),
      period: event.period,
      elapsedSeconds: event.elapsed_seconds,
      eventOrder: event.event_order,
      createdAt: Number.isNaN(Date.parse(event.created_at))
        ? Date.now()
        : Date.parse(event.created_at),
      status: event.status,
    };
  });

  return {
    teamA: {
      id: snapshot.team_a.id,
      key: "A",
      name: snapshot.team_a.name,
      logo: getBase64ImageSrc(snapshot.team_a.logo_base64) ?? undefined,
      score: snapshot.team_a.score,
      fouls: snapshot.team_a.fouls,
      selectedPlayer: teamAPlayers[0]?.key ?? null,
      players: teamAPlayers,
    },
    teamB: {
      id: snapshot.team_b.id,
      key: "B",
      name: snapshot.team_b.name,
      logo: getBase64ImageSrc(snapshot.team_b.logo_base64) ?? undefined,
      score: snapshot.team_b.score,
      fouls: snapshot.team_b.fouls,
      selectedPlayer: teamBPlayers[0]?.key ?? null,
      players: teamBPlayers,
    },
    history,
    arrow: "A",
    controlMode: "buttons",
    period: getLatestPeriod(snapshot),
    clockSeconds: DEFAULT_CLOCK_SECONDS,
    shotClockSeconds: DEFAULT_SHOT_CLOCK_SECONDS,
    clockRunning: false,
  };
}

function mapHistoryEventToMutationPayload(
  event: ScoreboardHistoryEvent,
): ScoreboardEventMutationPayload {
  const hasRealPlayer = event.playerId !== null && event.playerId !== undefined;

  return {
    team_key: event.team,
    player_id: event.playerId ?? null,
    guest_name: hasRealPlayer ? null : event.player,
    event_type: FRONTEND_TO_API_EVENT_TYPE[event.type],
    period: event.period,
    elapsed_seconds: event.elapsedSeconds,
  };
}

export async function getScoreboardSnapshot(matchId: number, signal?: AbortSignal) {
  const snapshot = await requestJson(
    apiClient.get(`/matches/${matchId}/scoreboard`, { signal }),
    apiScoreboardSnapshotSchema,
    "No se pudo cargar el marcador del partido.",
  );

  return buildScoreboardState(snapshot);
}

export async function saveMatchEvent(
  event: ScoreboardHistoryEvent,
  matchId?: number,
) {
  if (!matchId) {
    return null;
  }

  const snapshot = await requestJson(
    apiClient.post(
      `/matches/${matchId}/scoreboard/events`,
      mapHistoryEventToMutationPayload(event),
    ),
    apiScoreboardSnapshotSchema,
    "No se pudo guardar el evento del marcador.",
  );

  return buildScoreboardState(snapshot);
}

export async function undoMatchEvent(matchId?: number) {
  if (!matchId) {
    return null;
  }

  const snapshot = await requestJson(
    apiClient.post(`/matches/${matchId}/scoreboard/undo`),
    apiScoreboardSnapshotSchema,
    "No se pudo deshacer el ultimo evento del marcador.",
  );

  return buildScoreboardState(snapshot);
}

export async function resetMatchScoreboard(matchId?: number) {
  if (!matchId) {
    return null;
  }

  const snapshot = await requestJson(
    apiClient.post(`/matches/${matchId}/scoreboard/reset`),
    apiScoreboardSnapshotSchema,
    "No se pudo reiniciar el marcador del partido.",
  );

  return buildScoreboardState(snapshot);
}

export async function finishMatch(state: ScoreboardState, matchId?: number) {
  if (!matchId) {
    return state;
  }

  return requestJson(
    apiClient.put(`/matches/${matchId}`, {
      score_team_a: state.teamA.score,
      score_team_b: state.teamB.score,
      status: "finished",
    }),
    apiMatchSchema,
    "No se pudo finalizar el partido.",
  );
}
