import { z } from "zod";

import type { ScoreboardState } from "@/features/scoreboard/Scoreboard.types";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const nullableOptionalIntSchema = z
  .number()
  .int()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);
const nullableOptionalStringSchema = z
  .string()
  .nullable()
  .optional()
  .transform((value) => value ?? undefined);
const scoreboardTeamKeySchema = z.enum(["A", "B"]);
const scoreboardControlModeSchema = z.enum(["buttons", "keyboard"]);
const scoreboardEventTypeSchema = z.enum([
  "POINT_1",
  "POINT_2",
  "POINT_3",
  "ASSIST",
  "MISSED_SHOT",
  "REBOUND",
  "FOUL",
]);
const scoreboardEventStatusSchema = z.enum(["active", "voided"]);

const scoreboardPlayerSchema = z.object({
  key: z.string().min(1),
  playerId: z.number().int().nullable(),
  label: z.string().min(1),
  name: z.string().min(1),
  shirtNumber: z.string().nullable(),
});

const scoreboardHistoryEventSchema = z.object({
  id: z.string().min(1),
  type: scoreboardEventTypeSchema,
  team: scoreboardTeamKeySchema,
  teamId: nullableOptionalIntSchema,
  player: z.string().min(1),
  playerId: z.number().int().nullable().optional(),
  points: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  text: z.string().min(1),
  period: z.number().int().min(1),
  elapsedSeconds: z.number().int().min(0),
  eventOrder: z.number().int().min(0),
  createdAt: z.number().int().min(0),
  backendEventId: nullableOptionalIntSchema,
  status: scoreboardEventStatusSchema
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
});

const scoreboardTeamStateSchema = z.object({
  id: nullableOptionalIntSchema,
  key: scoreboardTeamKeySchema,
  name: z.string().min(1),
  logo: nullableOptionalStringSchema,
  score: z.number().int().min(0),
  fouls: z.number().int().min(0),
  selectedPlayer: z.string().nullable(),
  players: z.array(scoreboardPlayerSchema),
});

const scoreboardStateSchema = z.object({
  teamA: scoreboardTeamStateSchema,
  teamB: scoreboardTeamStateSchema,
  history: z.array(scoreboardHistoryEventSchema),
  arrow: scoreboardTeamKeySchema,
  controlMode: scoreboardControlModeSchema,
  period: z.number().int().min(1),
  clockSeconds: z.number().int().min(0),
  shotClockSeconds: z.number().int().min(0),
  clockRunning: z.boolean(),
}) satisfies z.ZodType<ScoreboardState>;

const scoreboardRealtimeMessageSchema = z.object({
  type: z.literal("scoreboard_state"),
  payload: scoreboardStateSchema,
});

export type ScoreboardRealtimeRole = "control" | "live";

function getScoreboardWebSocketBaseUrl() {
  if (typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim()) {
    const url = new URL(rawApiBaseUrl.trim());
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/+$/, "");
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}`;
}

export function buildScoreboardWebSocketUrl(
  matchId: number,
  role: ScoreboardRealtimeRole,
) {
  const url = new URL(
    `/ws/scoreboard/${matchId}`,
    `${getScoreboardWebSocketBaseUrl()}/`,
  );
  url.searchParams.set("role", role);
  return url.toString();
}

export function createScoreboardRealtimeMessage(state: ScoreboardState) {
  return JSON.stringify({
    type: "scoreboard_state",
    payload: state,
  });
}

export function parseScoreboardRealtimeMessage(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage);
    return scoreboardRealtimeMessageSchema.parse(parsed).payload;
  } catch (error) {
    console.error("No se pudo interpretar el mensaje realtime del marcador:", error);
    return null;
  }
}

