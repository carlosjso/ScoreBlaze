import { z, type ZodType } from "zod";

import { apiMatchSchema } from "@/features/quick-matches/schemas/QuickMatches.schema";
import { apiClient, getApiErrorMessage } from "@/shared/api/client";

const idSchema = z.coerce.number().int();
const quickMatchStatsTeamKeySchema = z.enum(["A", "B"]);
const quickMatchStatsEventTypeSchema = z.enum([
  "point_1",
  "point_2",
  "point_3",
  "assist",
  "miss",
  "rebound",
  "foul",
]);
const quickMatchStatsEventStatusSchema = z.enum(["active", "voided"]);

export type QuickMatchStatsTeamKey = z.infer<typeof quickMatchStatsTeamKeySchema>;
export type QuickMatchStatsEventType = z.infer<typeof quickMatchStatsEventTypeSchema>;
export type QuickMatchStatsEventStatus = z.infer<typeof quickMatchStatsEventStatusSchema>;

export type QuickMatchStatsPlayer = {
  id: number | null;
  name: string;
  shirt_number: string | null;
  label: string;
};

export type QuickMatchStatsTeamSnapshot = {
  id: number;
  key: QuickMatchStatsTeamKey;
  name: string;
  logo_base64: string | null;
  score: number;
  fouls: number;
  players: QuickMatchStatsPlayer[];
};

export type QuickMatchStatsEvent = {
  id: number;
  team_key: QuickMatchStatsTeamKey;
  team_id: number;
  player_id: number | null;
  guest_name: string | null;
  event_type: QuickMatchStatsEventType;
  period: number;
  elapsed_seconds: number;
  event_order: number;
  status: QuickMatchStatsEventStatus;
  created_at: string;
};

export type QuickMatchStatsSnapshot = {
  match: z.infer<typeof apiMatchSchema>;
  team_a: QuickMatchStatsTeamSnapshot;
  team_b: QuickMatchStatsTeamSnapshot;
  events: QuickMatchStatsEvent[];
};

const quickMatchStatsPlayerSchema = z.object({
  id: idSchema.nullable(),
  name: z.string().trim().min(1),
  shirt_number: z.string().trim().nullable(),
  label: z.string().trim().min(1),
}) satisfies z.ZodType<QuickMatchStatsPlayer>;

const quickMatchStatsTeamSnapshotSchema = z.object({
  id: idSchema,
  key: quickMatchStatsTeamKeySchema,
  name: z.string().trim().min(1),
  logo_base64: z.string().nullable(),
  score: z.number().int().min(0),
  fouls: z.number().int().min(0),
  players: z.array(quickMatchStatsPlayerSchema),
}) satisfies z.ZodType<QuickMatchStatsTeamSnapshot>;

const quickMatchStatsEventSchema = z.object({
  id: idSchema,
  team_key: quickMatchStatsTeamKeySchema,
  team_id: idSchema,
  player_id: idSchema.nullable(),
  guest_name: z.string().nullable(),
  event_type: quickMatchStatsEventTypeSchema,
  period: z.number().int().min(1),
  elapsed_seconds: z.number().int().min(0),
  event_order: z.number().int().min(0),
  status: quickMatchStatsEventStatusSchema,
  created_at: z.string().trim().min(1),
}) satisfies z.ZodType<QuickMatchStatsEvent>;

const quickMatchStatsSnapshotSchema = z.object({
  match: apiMatchSchema,
  team_a: quickMatchStatsTeamSnapshotSchema,
  team_b: quickMatchStatsTeamSnapshotSchema,
  events: z.array(quickMatchStatsEventSchema),
}) satisfies z.ZodType<QuickMatchStatsSnapshot>;

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

export async function getQuickMatchStatsSnapshot(matchId: number, signal?: AbortSignal) {
  return requestJson(
    apiClient.get(`/matches/${matchId}/scoreboard`, { signal }),
    quickMatchStatsSnapshotSchema,
    "No se pudieron cargar las estadisticas del partido.",
  );
}
