import { z } from "zod";

import {
  getPlayerStatus,
  type ApiPlayer,
  type ApiPlayerStat,
  type ApiTeam,
  type ApiTeamMembership,
  type PlayerFormValues,
  type PlayerListItem,
  type PlayerMutationPayload,
} from "@/features/players/Players.types";
import { buildPaginatedResponseSchema } from "@/shared/api/pagination";

function sanitizeTeamIds(teamIds: number[]): number[] {
  return [...new Set(teamIds)].sort((left, right) => left - right);
}

const idSchema = z.coerce.number().int();
type PlayerFormFieldName = Extract<keyof PlayerFormValues, string>;
const PLAYER_PHONE_MAX_VALUE = 9_223_372_036_854_775_807n;

export const PLAYER_FORM_LIMITS = {
  name: 100,
  email: 120,
  phone: 10,
  nationality: 80,
  favoritePosition: 60,
  age: 2,
  heightCm: 3,
  weightKg: 3,
} as const;

export const apiPlayerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.preprocess((value) => value ?? null, z.string().nullable()),
  age: z.preprocess((value) => value ?? null, z.coerce.number().int().min(1).max(99).nullable()),
  height_cm: z.preprocess((value) => value ?? null, z.coerce.number().int().min(80).max(260).nullable()),
  weight_kg: z.preprocess((value) => value ?? null, z.coerce.number().int().min(20).max(250).nullable()),
  nationality: z.preprocess((value) => value ?? null, z.string().trim().nullable()),
  favorite_position: z.preprocess((value) => value ?? null, z.string().trim().nullable()),
  photo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
}) satisfies z.ZodType<ApiPlayer>;

export const apiPlayersSchema = z.array(apiPlayerSchema);

export const apiPlayerStatSchema = z.object({
  player_id: idSchema,
  matches_played: z.coerce.number().int().min(0),
  total_points: z.coerce.number().int().min(0),
  made_1pt: z.coerce.number().int().min(0),
  made_2pt: z.coerce.number().int().min(0),
  made_3pt: z.coerce.number().int().min(0),
  missed_shots: z.coerce.number().int().min(0),
  total_assists: z.coerce.number().int().min(0),
  total_rebounds: z.coerce.number().int().min(0),
  total_fouls: z.coerce.number().int().min(0),
  tracked_made_shots: z.preprocess((value) => value ?? null, z.coerce.number().int().min(0).nullable()),
  tracked_shot_attempts: z.preprocess((value) => value ?? null, z.coerce.number().int().min(0).nullable()),
  shooting_accuracy: z.preprocess((value) => value ?? null, z.coerce.number().min(0).max(100).nullable()),
  updated_at: z.string().trim().min(1),
}) satisfies z.ZodType<ApiPlayerStat>;

export const apiTeamSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
}) satisfies z.ZodType<ApiTeam>;

export const apiTeamsSchema = z.array(apiTeamSchema);

export const apiTeamMembershipSchema = z.object({
  player_id: idSchema,
  team_id: idSchema,
  shirt_number: z.string().nullable(),
}) satisfies z.ZodType<ApiTeamMembership>;

export const apiTeamMembershipsSchema = z.array(apiTeamMembershipSchema);

const apiPlayerTableTeamSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
  })
  .transform((team) => ({
    id: team.id,
    name: team.name,
    logoBase64: team.logo_base64,
  }));

export const apiPaginatedPlayersTableSchema = buildPaginatedResponseSchema(
  z
    .object({
      id: idSchema,
      name: z.string().trim().min(1),
      email: z.string().trim().email(),
      phone: z.string(),
      age: z.preprocess((value) => value ?? null, z.coerce.number().int().min(1).max(99).nullable()),
      height_cm: z.preprocess((value) => value ?? null, z.coerce.number().int().min(80).max(260).nullable()),
      weight_kg: z.preprocess((value) => value ?? null, z.coerce.number().int().min(20).max(250).nullable()),
      nationality: z.preprocess((value) => value ?? null, z.string().trim().nullable()),
      favorite_position: z.preprocess((value) => value ?? null, z.string().trim().nullable()),
      photo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
      team_ids: z.array(idSchema),
      team_names: z.array(z.string().trim().min(1)),
      teams: z.array(apiPlayerTableTeamSchema),
      team_label: z.string(),
      teams_count: z.coerce.number().int().min(0),
      status: z.union([z.literal("Con equipo"), z.literal("Sin equipo")]),
    })
    .transform(
      (player): PlayerListItem => ({
        id: player.id,
        name: player.name,
        email: player.email,
        phone: player.phone,
        age: player.age,
        heightCm: player.height_cm,
        weightKg: player.weight_kg,
        nationality: player.nationality ?? "",
        favoritePosition: player.favorite_position ?? "",
        photoBase64: player.photo_base64,
        teamIds: sanitizeTeamIds(player.team_ids),
        teamNames: player.team_names,
        teams: player.teams,
        teamLabel: player.team_label,
        teamsCount: player.teams_count,
        status: player.status,
      }),
    ),
);

export const playerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del jugador es obligatorio.")
    .max(PLAYER_FORM_LIMITS.name, "El nombre del jugador no puede exceder 100 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "El correo del jugador es obligatorio.")
    .max(PLAYER_FORM_LIMITS.email, "El correo del jugador no puede exceder 120 caracteres.")
    .email("Ingresa un correo valido."),
  phone: z
    .string()
    .trim()
    .max(PLAYER_FORM_LIMITS.phone, "El telefono no puede exceder 10 digitos.")
    .refine((value) => value === "" || /^\d+$/.test(value), "El telefono debe contener solo numeros.")
    .refine((value) => value === "" || value.length === PLAYER_FORM_LIMITS.phone, "El telefono debe tener 10 digitos.")
    .refine(
      (value) => value === "" || !/^\d+$/.test(value) || BigInt(value) <= PLAYER_PHONE_MAX_VALUE,
      "El telefono excede el tamano maximo permitido.",
    ),
  age: z
    .string()
    .trim()
    .max(PLAYER_FORM_LIMITS.age, "La edad no puede exceder 2 digitos.")
    .refine((value) => value === "" || /^\d+$/.test(value), "La edad debe contener solo numeros.")
    .refine((value) => value === "" || (Number(value) >= 1 && Number(value) <= 99), "La edad debe estar entre 1 y 99."),
  heightCm: z
    .string()
    .trim()
    .max(PLAYER_FORM_LIMITS.heightCm, "La estatura no puede exceder 3 digitos.")
    .refine((value) => value === "" || /^\d+$/.test(value), "La estatura debe contener solo numeros.")
    .refine((value) => value === "" || (Number(value) >= 80 && Number(value) <= 260), "La estatura debe estar entre 80 y 260 cm."),
  weightKg: z
    .string()
    .trim()
    .max(PLAYER_FORM_LIMITS.weightKg, "El peso no puede exceder 3 digitos.")
    .refine((value) => value === "" || /^\d+$/.test(value), "El peso debe contener solo numeros.")
    .refine((value) => value === "" || (Number(value) >= 20 && Number(value) <= 250), "El peso debe estar entre 20 y 250 kg."),
  nationality: z
    .string()
    .trim()
    .max(PLAYER_FORM_LIMITS.nationality, "La nacionalidad no puede exceder 80 caracteres."),
  favoritePosition: z
    .string()
    .trim()
    .max(PLAYER_FORM_LIMITS.favoritePosition, "La posicion favorita no puede exceder 60 caracteres."),
  photoBase64: z.string().nullable(),
  teamIds: z.array(z.number().int()),
}) satisfies z.ZodType<PlayerFormValues>;

export const playerFormApiFieldMap = {
  name: "name",
  email: "email",
  phone: "phone",
  age: "age",
  height_cm: "heightCm",
  weight_kg: "weightKg",
  nationality: "nationality",
  favorite_position: "favoritePosition",
  photo_base64: "photoBase64",
  team_ids: "teamIds",
} satisfies Record<string, PlayerFormFieldName>;

export const playerFormApiMessageFieldMap = {
  "Ya existe un jugador con ese correo.": "email",
  "No se pudo procesar la foto.": "photoBase64",
} satisfies Record<string, PlayerFormFieldName | readonly PlayerFormFieldName[]>;

export function parsePlayerResponse(input: unknown): ApiPlayer {
  return apiPlayerSchema.parse(input);
}

export function parsePlayersResponse(input: unknown): ApiPlayer[] {
  return apiPlayersSchema.parse(input);
}

export function parseTeamResponse(input: unknown): ApiTeam {
  return apiTeamSchema.parse(input);
}

export function parseTeamsResponse(input: unknown): ApiTeam[] {
  return apiTeamsSchema.parse(input);
}

export function parseTeamMembershipResponse(input: unknown): ApiTeamMembership {
  return apiTeamMembershipSchema.parse(input);
}

export function parseTeamMembershipsResponse(input: unknown): ApiTeamMembership[] {
  return apiTeamMembershipsSchema.parse(input);
}

export function buildPlayersView(
  players: ApiPlayer[],
  teams: ApiTeam[],
  memberships: ApiTeamMembership[],
): PlayerListItem[] {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const teamIdsByPlayerId = new Map<number, number[]>();

  memberships.forEach((membership) => {
    const current = teamIdsByPlayerId.get(membership.player_id) ?? [];
    current.push(membership.team_id);
    teamIdsByPlayerId.set(membership.player_id, current);
  });

  return players.map((player) => {
    const teamIds = sanitizeTeamIds(teamIdsByPlayerId.get(player.id) ?? []);
    const playerTeams = teamIds.map((teamId) => {
      const team = teamById.get(teamId);

      return {
        id: teamId,
        name: team?.name ?? `Equipo #${teamId}`,
        logoBase64: team?.logo_base64 ?? null,
      };
    });
    const teamNames = playerTeams.map((team) => team.name);

    return {
      id: player.id,
      name: player.name,
      email: player.email,
      phone: player.phone ?? "",
      age: player.age,
      heightCm: player.height_cm,
      weightKg: player.weight_kg,
      nationality: player.nationality ?? "",
      favoritePosition: player.favorite_position ?? "",
      photoBase64: player.photo_base64,
      teamIds,
      teamNames,
      teams: playerTeams,
      teamLabel: teamNames.length > 0 ? teamNames.join(", ") : "Sin equipo",
      teamsCount: teamNames.length,
      status: getPlayerStatus(teamIds),
    };
  });
}

export function toPlayerFormValues(player?: PlayerListItem | null): PlayerFormValues {
  if (player) {
    return {
      name: player.name,
      email: player.email,
      phone: player.phone,
      age: player.age === null ? "" : String(player.age),
      heightCm: player.heightCm === null ? "" : String(player.heightCm),
      weightKg: player.weightKg === null ? "" : String(player.weightKg),
      nationality: player.nationality,
      favoritePosition: player.favoritePosition,
      photoBase64: player.photoBase64,
      teamIds: sanitizeTeamIds(player.teamIds),
    };
  }

  return {
    name: "",
    email: "",
    phone: "",
    age: "",
    heightCm: "",
    weightKg: "",
    nationality: "",
    favoritePosition: "",
    photoBase64: null,
    teamIds: [],
  };
}

export function toPlayerMutationPayload(values: PlayerFormValues): PlayerMutationPayload {
  const normalizedValues = playerFormSchema.parse(values);
  const normalizedPhone = normalizedValues.phone.trim();

  return {
    name: normalizedValues.name.trim(),
    email: normalizedValues.email.trim().toLowerCase(),
    phone: normalizedPhone || null,
    age: normalizedValues.age.trim() ? Number(normalizedValues.age) : null,
    height_cm: normalizedValues.heightCm.trim() ? Number(normalizedValues.heightCm) : null,
    weight_kg: normalizedValues.weightKg.trim() ? Number(normalizedValues.weightKg) : null,
    nationality: normalizedValues.nationality.trim() || null,
    favorite_position: normalizedValues.favoritePosition.trim() || null,
    photo_base64: normalizedValues.photoBase64?.trim() ? normalizedValues.photoBase64.trim() : null,
    team_ids: sanitizeTeamIds(normalizedValues.teamIds),
  };
}
