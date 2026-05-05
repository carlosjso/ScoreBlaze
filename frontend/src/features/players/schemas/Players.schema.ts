import { z } from "zod";

import {
  getPlayerStatus,
  type ApiPlayer,
  type ApiTeam,
  type ApiTeamMembership,
  type PlayerFormValues,
  type PlayerListItem,
  type PlayerMutationPayload,
} from "@/features/players/Players.types";

function sanitizeTeamIds(teamIds: number[]): number[] {
  return [...new Set(teamIds)].sort((left, right) => left - right);
}

const idSchema = z.coerce.number().int();
type PlayerFormFieldName = Extract<keyof PlayerFormValues, string>;
const PLAYER_PHONE_MAX_VALUE = 9_223_372_036_854_775_807n;

export const PLAYER_FORM_LIMITS = {
  name: 100,
  email: 120,
  phone: 19,
} as const;

export const apiPlayerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.number().int().nullable(),
  photo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
}) satisfies z.ZodType<ApiPlayer>;

export const apiPlayersSchema = z.array(apiPlayerSchema);

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
    .max(PLAYER_FORM_LIMITS.phone, "El telefono no puede exceder 19 digitos.")
    .refine((value) => value === "" || /^\d+$/.test(value), "El telefono debe contener solo numeros.")
    .refine(
      (value) => value === "" || !/^\d+$/.test(value) || BigInt(value) <= PLAYER_PHONE_MAX_VALUE,
      "El telefono excede el tamaño maximo permitido.",
    ),
  photoBase64: z.string().nullable(),
  teamIds: z.array(z.number().int()),
}) satisfies z.ZodType<PlayerFormValues>;

export const playerFormApiFieldMap = {
  name: "name",
  email: "email",
  phone: "phone",
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
  memberships: ApiTeamMembership[]
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
      phone: player.phone === null ? "" : String(player.phone),
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
      photoBase64: player.photoBase64,
      teamIds: sanitizeTeamIds(player.teamIds),
    };
  }

  return {
    name: "",
    email: "",
    phone: "",
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
    phone: normalizedPhone ? Number(normalizedPhone) : null,
    photo_base64: normalizedValues.photoBase64?.trim() ? normalizedValues.photoBase64.trim() : null,
    team_ids: sanitizeTeamIds(normalizedValues.teamIds),
  };
}

