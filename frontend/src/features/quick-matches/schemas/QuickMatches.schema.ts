import { z } from "zod";

import {
  formatMatchDate,
  formatMatchTimeRange,
  getMatchResultLabel,
  getMatchResultOptionFromApiMatch,
  getMatchStatusLabel,
  type ApiMatch,
  type ApiTeamOption,
  type MatchMutationPayload,
  type QuickMatchFormValues,
  type QuickMatchListItem,
} from "@/features/quick-matches/QuickMatches.types";

const idSchema = z.coerce.number().int();
const matchStatusSchema = z.enum(["scheduled", "live", "finished"]);
const matchResultSchema = z.enum(["pending", "draw", "team_a", "team_b"]);
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeInputRegex = /^\d{2}:\d{2}$/;
const timeApiRegex = /^\d{2}:\d{2}(:\d{2})?$/;
const scoreInputSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), "Ingresa un numero entero igual o mayor a 0.");

function normalizeTimeInput(value: string): string {
  return value.slice(0, 5);
}

function toTimeMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function toApiTime(value: string): string {
  return `${normalizeTimeInput(value)}:00`;
}

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export const apiTeamOptionSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
}) satisfies z.ZodType<ApiTeamOption>;

export const apiTeamsOptionsSchema = z.array(apiTeamOptionSchema);

export const apiMatchSchema = z.object({
  id: idSchema,
  match_date: z.string().regex(dateRegex),
  start_time: z.string().regex(timeApiRegex),
  end_time: z.string().regex(timeApiRegex),
  team_a_id: idSchema,
  team_b_id: idSchema,
  score_team_a: z.number().int().nullable(),
  score_team_b: z.number().int().nullable(),
  winner_team_id: idSchema.nullable(),
  is_draw: z.boolean(),
  court: z.string().nullable(),
  tournament: z.string().nullable(),
  status: matchStatusSchema,
}) satisfies z.ZodType<ApiMatch>;

export const apiMatchesSchema = z.array(apiMatchSchema);

export const quickMatchFormSchema = z
  .object({
    teamAId: z.number().int().positive("Selecciona el equipo A."),
    teamBId: z.number().int().positive("Selecciona el equipo B."),
    matchDate: z
      .string()
      .trim()
      .min(1, "La fecha del partido es obligatoria.")
      .regex(dateRegex, "La fecha no es valida."),
    startTime: z
      .string()
      .trim()
      .min(1, "La hora de inicio es obligatoria.")
      .regex(timeInputRegex, "La hora de inicio no es valida."),
    endTime: z
      .string()
      .trim()
      .min(1, "La hora de fin es obligatoria.")
      .regex(timeInputRegex, "La hora de fin no es valida."),
    status: matchStatusSchema,
    scoreTeamA: scoreInputSchema,
    scoreTeamB: scoreInputSchema,
    result: matchResultSchema,
    court: z.string().max(250, "La cancha no puede exceder 250 caracteres."),
    tournament: z.string().max(250, "El torneo no puede exceder 250 caracteres."),
  })
  .superRefine((values, context) => {
    if (values.teamAId === values.teamBId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "El equipo A y el equipo B no pueden ser el mismo.",
        path: ["teamBId"],
      });
    }

    if (timeInputRegex.test(values.startTime) && timeInputRegex.test(values.endTime)) {
      if (toTimeMinutes(values.startTime) >= toTimeMinutes(values.endTime)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La hora de inicio debe ser anterior a la hora de fin.",
          path: ["endTime"],
        });
      }
    }

    const hasScoreA = values.scoreTeamA.trim() !== "";
    const hasScoreB = values.scoreTeamB.trim() !== "";

    if (hasScoreA !== hasScoreB) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Captura ambos marcadores o deja ambos vacios.",
        path: ["scoreTeamA"],
      });
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Captura ambos marcadores o deja ambos vacios.",
        path: ["scoreTeamB"],
      });
    }
  }) satisfies z.ZodType<QuickMatchFormValues>;

export function buildQuickMatchesView(matches: ApiMatch[], teams: ApiTeamOption[]): QuickMatchListItem[] {
  const teamById = new Map(teams.map((team) => [team.id, team]));

  return matches.map((match) => {
    const teamA = teamById.get(match.team_a_id);
    const teamB = teamById.get(match.team_b_id);
    const teamAName = teamA?.name ?? `Equipo #${match.team_a_id}`;
    const teamBName = teamB?.name ?? `Equipo #${match.team_b_id}`;
    const court = match.court?.trim() ?? "";
    const tournament = match.tournament?.trim() ?? "";
    const venueLabel = [court, tournament].filter(Boolean).join(" | ") || "Sin sede";
    const scoreLabel =
      match.score_team_a !== null && match.score_team_b !== null
        ? `${match.score_team_a} - ${match.score_team_b}`
        : "Sin marcador";

    return {
      id: match.id,
      teamAId: match.team_a_id,
      teamBId: match.team_b_id,
      teamAName,
      teamBName,
      teamALogoBase64: teamA?.logo_base64 ?? null,
      teamBLogoBase64: teamB?.logo_base64 ?? null,
      matchupLabel: `${teamAName} vs ${teamBName}`,
      matchDate: match.match_date,
      dateLabel: formatMatchDate(match.match_date),
      startTime: normalizeTimeInput(match.start_time),
      endTime: normalizeTimeInput(match.end_time),
      timeLabel: formatMatchTimeRange(match.start_time, match.end_time),
      scheduleLabel: `${formatMatchDate(match.match_date)} | ${formatMatchTimeRange(match.start_time, match.end_time)}`,
      scoreTeamA: match.score_team_a,
      scoreTeamB: match.score_team_b,
      scoreLabel,
      winnerTeamId: match.winner_team_id,
      isDraw: match.is_draw,
      resultLabel: getMatchResultLabel({
        teamAId: match.team_a_id,
        teamBId: match.team_b_id,
        teamAName,
        teamBName,
        scoreTeamA: match.score_team_a,
        scoreTeamB: match.score_team_b,
        winnerTeamId: match.winner_team_id,
        isDraw: match.is_draw,
      }),
      court,
      tournament,
      venueLabel,
      status: match.status,
      statusLabel: getMatchStatusLabel(match.status),
    };
  });
}

export function toQuickMatchFormValues(
  match: QuickMatchListItem | null | undefined,
  teams: ApiTeamOption[] = []
): QuickMatchFormValues {
  if (match) {
    return {
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      matchDate: match.matchDate,
      startTime: match.startTime,
      endTime: match.endTime,
      status: match.status,
      scoreTeamA: match.scoreTeamA === null ? "" : String(match.scoreTeamA),
      scoreTeamB: match.scoreTeamB === null ? "" : String(match.scoreTeamB),
      result: getMatchResultOptionFromApiMatch({
        team_a_id: match.teamAId,
        team_b_id: match.teamBId,
        winner_team_id: match.winnerTeamId,
        is_draw: match.isDraw,
      }),
      court: match.court,
      tournament: match.tournament,
    };
  }

  const defaultTeamAId = teams[0]?.id ?? 0;
  const defaultTeamBId = teams.find((team) => team.id !== defaultTeamAId)?.id ?? defaultTeamAId;

  return {
    teamAId: defaultTeamAId,
    teamBId: defaultTeamBId,
    matchDate: "",
    startTime: "",
    endTime: "",
    status: "scheduled",
    scoreTeamA: "",
    scoreTeamB: "",
    result: "pending",
    court: "",
    tournament: "",
  };
}

export function toQuickMatchMutationPayload(values: QuickMatchFormValues): MatchMutationPayload {
  const normalizedValues = quickMatchFormSchema.parse(values);
  const hasScores = normalizedValues.scoreTeamA.trim() !== "" && normalizedValues.scoreTeamB.trim() !== "";

  let scoreTeamA: number | null = null;
  let scoreTeamB: number | null = null;
  let winnerTeamId: number | null = null;
  let isDraw = false;

  if (hasScores) {
    scoreTeamA = Number(normalizedValues.scoreTeamA.trim());
    scoreTeamB = Number(normalizedValues.scoreTeamB.trim());

    if (scoreTeamA === scoreTeamB) {
      isDraw = true;
    } else {
      winnerTeamId = scoreTeamA > scoreTeamB ? normalizedValues.teamAId : normalizedValues.teamBId;
    }
  } else {
    if (normalizedValues.result === "draw") {
      isDraw = true;
    } else if (normalizedValues.result === "team_a") {
      winnerTeamId = normalizedValues.teamAId;
    } else if (normalizedValues.result === "team_b") {
      winnerTeamId = normalizedValues.teamBId;
    }
  }

  return {
    match_date: normalizedValues.matchDate,
    start_time: toApiTime(normalizedValues.startTime),
    end_time: toApiTime(normalizedValues.endTime),
    team_a_id: normalizedValues.teamAId,
    team_b_id: normalizedValues.teamBId,
    score_team_a: scoreTeamA,
    score_team_b: scoreTeamB,
    winner_team_id: winnerTeamId,
    is_draw: isDraw,
    court: normalizeOptionalText(normalizedValues.court),
    tournament: normalizeOptionalText(normalizedValues.tournament),
    status: normalizedValues.status,
  };
}
