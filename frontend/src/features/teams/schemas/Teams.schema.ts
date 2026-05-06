import { z } from "zod";

import { buildPaginatedResponseSchema } from "@/shared/api/pagination";
import {
  getTeamRosterStatus,
  type ApiPlayer,
  type ApiTeam,
  type ApiTeamMembership,
  type TeamFormValues,
  type TeamListItem,
  type TeamMutationPayload,
} from "@/features/teams/Teams.types";

function sanitizePlayerIds(playerIds: number[]): number[] {
  return [...new Set(playerIds)].sort((left, right) => left - right);
}

const idSchema = z.coerce.number().int();
type TeamFormFieldName = Extract<keyof TeamFormValues, string>;

export const TEAM_FORM_LIMITS = {
  name: 80,
  responsibleName: 100,
  responsiblePhone: 19,
  responsibleEmail: 120,
} as const;

export const apiTeamSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  responsible_name: z.preprocess((value) => value ?? null, z.string().nullable()),
  responsible_phone: z.preprocess((value) => value ?? null, z.string().nullable()),
  responsible_email: z.preprocess((value) => value ?? null, z.string().nullable()),
  logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
}) satisfies z.ZodType<ApiTeam>;

export const apiTeamsSchema = z.array(apiTeamSchema);

export const apiPlayerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.number().int().nullable(),
  photo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
}) satisfies z.ZodType<ApiPlayer>;

export const apiPlayersSchema = z.array(apiPlayerSchema);

export const apiTeamMembershipSchema = z.object({
  player_id: idSchema,
  team_id: idSchema,
  shirt_number: z.string().nullable(),
}) satisfies z.ZodType<ApiTeamMembership>;

export const apiTeamMembershipsSchema = z.array(apiTeamMembershipSchema);

const apiTeamTablePlayerSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    phone: z.string(),
    photo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
  })
  .transform((player) => ({
    id: player.id,
    name: player.name,
    email: player.email,
    phone: player.phone,
    photoBase64: player.photo_base64,
  }));

export const apiPaginatedTeamsTableSchema = buildPaginatedResponseSchema(
  z
    .object({
      id: idSchema,
      name: z.string().trim().min(1),
      responsible_name: z.string(),
      responsible_phone: z.string(),
      responsible_email: z.string(),
      logo_base64: z.preprocess((value) => value ?? null, z.string().nullable()),
      player_ids: z.array(idSchema),
      player_count: z.coerce.number().int().min(0),
      players: z.array(apiTeamTablePlayerSchema),
      players_label: z.string(),
      roster_status: z.union([z.literal("Con jugadores"), z.literal("Sin jugadores")]),
    })
    .transform(
      (team): TeamListItem => ({
        id: team.id,
        name: team.name,
        responsibleName: team.responsible_name,
        responsiblePhone: team.responsible_phone,
        responsibleEmail: team.responsible_email,
        logoBase64: team.logo_base64,
        playerIds: sanitizePlayerIds(team.player_ids),
        playerCount: team.player_count,
        players: team.players,
        playersLabel: team.players_label,
        rosterStatus: team.roster_status,
      }),
    )
);

export const teamFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del equipo es obligatorio.")
    .max(TEAM_FORM_LIMITS.name, "El nombre del equipo no puede exceder 80 caracteres."),
  responsibleName: z
    .string()
    .trim()
    .min(1, "El nombre del responsable es obligatorio.")
    .max(TEAM_FORM_LIMITS.responsibleName, "El nombre del responsable no puede exceder 100 caracteres."),
  responsiblePhone: z
    .string()
    .trim()
    .min(1, "El telefono del responsable es obligatorio.")
    .max(TEAM_FORM_LIMITS.responsiblePhone, "El telefono del responsable no puede exceder 19 digitos.")
    .refine((value) => /^\d+$/.test(value), "El telefono del responsable debe contener solo numeros."),
  responsibleEmail: z
    .string()
    .trim()
    .min(1, "El correo del responsable es obligatorio.")
    .max(TEAM_FORM_LIMITS.responsibleEmail, "El correo del responsable no puede exceder 120 caracteres."),
  logoBase64: z.string().nullable(),
  playerIds: z.array(z.number().int()),
}) satisfies z.ZodType<TeamFormValues>;

export const teamFormApiFieldMap = {
  name: "name",
  responsible_name: "responsibleName",
  responsible_phone: "responsiblePhone",
  responsible_email: "responsibleEmail",
  logo_base64: "logoBase64",
  player_ids: "playerIds",
} satisfies Record<string, TeamFormFieldName>;

export const teamFormApiMessageFieldMap = {
  "Ya existe un equipo con ese nombre.": "name",
  "No se pudo procesar el logo.": "logoBase64",
} satisfies Record<string, TeamFormFieldName | readonly TeamFormFieldName[]>;

export function buildTeamsView(
  teams: ApiTeam[],
  players: ApiPlayer[],
  memberships: ApiTeamMembership[]
): TeamListItem[] {
  const playerById = new Map(players.map((player) => [player.id, player]));
  const playerIdsByTeamId = new Map<number, number[]>();

  memberships.forEach((membership) => {
    const current = playerIdsByTeamId.get(membership.team_id) ?? [];
    current.push(membership.player_id);
    playerIdsByTeamId.set(membership.team_id, current);
  });

  return teams.map((team) => {
    const playerIds = sanitizePlayerIds(playerIdsByTeamId.get(team.id) ?? []);
    const teamPlayers = playerIds
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is ApiPlayer => Boolean(player))
      .map((player) => ({
        id: player.id,
        name: player.name,
        email: player.email,
        phone: player.phone === null ? "" : String(player.phone),
        photoBase64: player.photo_base64,
      }));

    return {
      id: team.id,
      name: team.name,
      responsibleName: team.responsible_name ?? "",
      responsiblePhone: team.responsible_phone ?? "",
      responsibleEmail: team.responsible_email ?? "",
      logoBase64: team.logo_base64,
      playerIds,
      playerCount: teamPlayers.length,
      players: teamPlayers,
      playersLabel: teamPlayers.length > 0 ? teamPlayers.map((player) => player.name).join(", ") : "Sin jugadores",
      rosterStatus: getTeamRosterStatus(playerIds),
    };
  });
}

export function toTeamFormValues(team?: TeamListItem | null): TeamFormValues {
  if (team) {
    return {
      name: team.name,
      responsibleName: team.responsibleName,
      responsiblePhone: team.responsiblePhone,
      responsibleEmail: team.responsibleEmail,
      logoBase64: team.logoBase64,
      playerIds: sanitizePlayerIds(team.playerIds),
    };
  }

  return {
    name: "",
    responsibleName: "",
    responsiblePhone: "",
    responsibleEmail: "",
    logoBase64: null,
    playerIds: [],
  };
}

export function toTeamMutationPayload(values: TeamFormValues): TeamMutationPayload {
  const normalizedValues = teamFormSchema.parse(values);

  return {
    name: normalizedValues.name.trim(),
    responsible_name: normalizedValues.responsibleName.trim(),
    responsible_phone: normalizedValues.responsiblePhone.trim(),
    responsible_email: normalizedValues.responsibleEmail.trim(),
    logo_base64: normalizedValues.logoBase64?.trim() ? normalizedValues.logoBase64.trim() : null,
    player_ids: sanitizePlayerIds(normalizedValues.playerIds),
  };
}

