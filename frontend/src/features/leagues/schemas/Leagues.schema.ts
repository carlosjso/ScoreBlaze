import { z } from "zod";

import { buildPaginatedResponseSchema } from "@/shared/api/pagination";
import {
  leagueTrackedStatOptions,
  normalizeLeagueTrackedStats,
  sanitizeLeagueTeamIds,
  type ApiLeague,
  type ApiLeagueTableRow,
  type ApiLeagueTeamSummary,
  type LeagueDetail,
  type LeagueFormValues,
  type LeagueListItem,
  type LeagueMutationPayload,
  type LeagueTeamSummary,
} from "@/features/leagues/Leagues.types";

const idSchema = z.coerce.number().int();
const leagueStatusSchema = z.union([z.literal("En curso"), z.literal("Sin empezar"), z.literal("Finalizada")]);
type LeagueFormFieldName = Extract<keyof LeagueFormValues, string>;

export const LEAGUE_FORM_LIMITS = {
  name: 80,
  responsibleName: 100,
  responsibleEmail: 120,
  category: 80,
  trackedStats: 12,
} as const;

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

function toLeagueListItem(league: ApiLeague | ApiLeagueTableRow): LeagueListItem {
  return {
    id: league.id,
    name: league.name,
    responsibleName: league.responsible_name,
    responsibleEmail: league.responsible_email,
    category: league.category,
    status: league.status,
    startDate: league.start_date,
    endDate: league.end_date,
    logoBase64: "logo_base64" in league ? league.logo_base64 : null,
    trackedStats: normalizeLeagueTrackedStats(league.tracked_stats),
    teamIds: sanitizeLeagueTeamIds(league.team_ids),
    teamCount: "team_count" in league ? league.team_count : sanitizeLeagueTeamIds(league.team_ids).length,
  };
}

function toLeagueTeamSummary(team: ApiLeagueTeamSummary): LeagueTeamSummary {
  return {
    id: team.id,
    name: team.name,
    logoBase64: team.logo_base64,
    responsibleName: team.responsible_name,
    responsibleEmail: team.responsible_email,
    playerCount: team.player_count,
    playersLabel: team.players_label,
  };
}

export const apiLeagueSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    responsible_name: z.string().trim().min(1),
    responsible_email: z.string().trim().email(),
    category: z.string().trim().min(1),
    status: leagueStatusSchema,
    start_date: z.string().trim().min(1),
    end_date: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    tracked_stats: z.array(z.string()),
    team_ids: z.array(idSchema),
  })
  .transform((league): LeagueListItem => toLeagueListItem(league)) satisfies z.ZodType<LeagueListItem>;

export const apiLeaguesSchema = z.array(apiLeagueSchema);

export const apiLeagueTeamSummarySchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    responsible_name: z.string(),
    responsible_email: z.string(),
    player_count: z.coerce.number().int().min(0),
    players_label: z.string(),
  })
  .transform((team): LeagueTeamSummary => toLeagueTeamSummary(team)) satisfies z.ZodType<LeagueTeamSummary>;

export const apiLeagueDetailSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    responsible_name: z.string().trim().min(1),
    responsible_email: z.string().trim().email(),
    category: z.string().trim().min(1),
    status: leagueStatusSchema,
    start_date: z.string().trim().min(1),
    end_date: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
    tracked_stats: z.array(z.string()),
    team_ids: z.array(idSchema),
    teams: z.array(apiLeagueTeamSummarySchema),
    matches_count: z.coerce.number().int().min(0),
  })
  .transform(
    (league): LeagueDetail => ({
      ...toLeagueListItem(league),
      teams: league.teams,
      matchesCount: league.matches_count,
    }),
  ) satisfies z.ZodType<LeagueDetail>;

export const apiLeagueTableRowSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    responsible_name: z.string().trim().min(1),
    responsible_email: z.string().trim().email(),
    category: z.string().trim().min(1),
    status: leagueStatusSchema,
    start_date: z.string().trim().min(1),
    end_date: z.string().trim().min(1),
    tracked_stats: z.array(z.string()),
    team_ids: z.array(idSchema),
    team_count: z.coerce.number().int().min(0),
  })
  .transform((league): LeagueListItem => toLeagueListItem(league)) satisfies z.ZodType<LeagueListItem>;

export const apiPaginatedLeaguesTableSchema = buildPaginatedResponseSchema(apiLeagueTableRowSchema);

export const leagueFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "El nombre de la liga es obligatorio.")
      .max(LEAGUE_FORM_LIMITS.name, "El nombre de la liga no puede exceder 80 caracteres."),
    responsibleName: z
      .string()
      .trim()
      .min(1, "El nombre del responsable es obligatorio.")
      .max(LEAGUE_FORM_LIMITS.responsibleName, "El nombre del responsable no puede exceder 100 caracteres."),
    responsibleEmail: z
      .string()
      .trim()
      .min(1, "El correo del responsable es obligatorio.")
      .max(LEAGUE_FORM_LIMITS.responsibleEmail, "El correo del responsable no puede exceder 120 caracteres.")
      .email("Ingresa un correo valido."),
    category: z
      .string()
      .trim()
      .min(1, "La categoria es obligatoria.")
      .max(LEAGUE_FORM_LIMITS.category, "La categoria no puede exceder 80 caracteres."),
    status: leagueStatusSchema,
    startDate: z
      .string()
      .trim()
      .min(1, "La fecha de inicio es obligatoria.")
      .refine((value) => isValidDateString(value), "Selecciona una fecha de inicio valida."),
    endDate: z
      .string()
      .trim()
      .min(1, "La fecha de fin es obligatoria.")
      .refine((value) => isValidDateString(value), "Selecciona una fecha de fin valida."),
    logoBase64: z.string().nullable(),
    trackedStats: z.array(z.string()).max(LEAGUE_FORM_LIMITS.trackedStats, "No puedes registrar mas de 12 metricas."),
    teamIds: z.array(z.number().int()),
  })
  .refine((values) => values.startDate <= values.endDate, {
    message: "La fecha de inicio no puede ser posterior a la fecha final.",
    path: ["endDate"],
  }) satisfies z.ZodType<LeagueFormValues>;

export const leagueFormApiFieldMap = {
  name: "name",
  responsible_name: "responsibleName",
  responsible_email: "responsibleEmail",
  category: "category",
  status: "status",
  start_date: "startDate",
  end_date: "endDate",
  logo_base64: "logoBase64",
  tracked_stats: "trackedStats",
  team_ids: "teamIds",
} satisfies Record<string, LeagueFormFieldName>;

export const leagueFormApiMessageFieldMap = {
  "Ya existe una liga con ese nombre.": "name",
  "La fecha de inicio de la liga no puede ser posterior a la fecha final.": ["startDate", "endDate"],
  "No se pudo procesar el logo de la liga.": "logoBase64",
} satisfies Record<string, LeagueFormFieldName | readonly LeagueFormFieldName[]>;

export function toLeagueFormValues(league?: LeagueListItem | LeagueDetail | null): LeagueFormValues {
  if (league) {
    return {
      name: league.name,
      responsibleName: league.responsibleName,
      responsibleEmail: league.responsibleEmail,
      category: league.category,
      status: league.status,
      startDate: league.startDate,
      endDate: league.endDate,
      logoBase64: league.logoBase64,
      trackedStats: normalizeLeagueTrackedStats(league.trackedStats),
      teamIds: sanitizeLeagueTeamIds(league.teamIds),
    };
  }

  return {
    name: "",
    responsibleName: "",
    responsibleEmail: "",
    category: "",
    status: "Sin empezar",
    startDate: "",
    endDate: "",
    logoBase64: null,
    trackedStats: [...leagueTrackedStatOptions],
    teamIds: [],
  };
}

export function toLeagueMutationPayload(values: LeagueFormValues): LeagueMutationPayload {
  const normalizedValues = leagueFormSchema.parse(values);

  return {
    name: normalizedValues.name.trim(),
    responsible_name: normalizedValues.responsibleName.trim(),
    responsible_email: normalizedValues.responsibleEmail.trim().toLowerCase(),
    category: normalizedValues.category.trim(),
    status: normalizedValues.status,
    start_date: normalizedValues.startDate,
    end_date: normalizedValues.endDate,
    logo_base64: normalizedValues.logoBase64?.trim() ? normalizedValues.logoBase64.trim() : null,
    tracked_stats: normalizeLeagueTrackedStats(normalizedValues.trackedStats),
    team_ids: sanitizeLeagueTeamIds(normalizedValues.teamIds),
  };
}
