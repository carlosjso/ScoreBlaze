import { z } from "zod";

import {
  getPlayerStatus,
  type ApiPlayer,
  type ApiTeam,
  type ApiTeamMembership,
  type PlayerFormValues,
  type PlayerListItem,
  type PlayerMutationPayload,
} from "@/pages/players/Players.types";

function sanitizeTeamIds(teamIds: number[]): number[] {
  return [...new Set(teamIds)].sort((left, right) => left - right);
}

const idSchema = z.coerce.number().int();

export const apiPlayerSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  phone: z.number().int().nullable(),
}) satisfies z.ZodType<ApiPlayer>;

export const apiPlayersSchema = z.array(apiPlayerSchema);

export const apiTeamSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1),
}) satisfies z.ZodType<ApiTeam>;

export const apiTeamsSchema = z.array(apiTeamSchema);

export const apiTeamMembershipSchema = z.object({
  player_id: idSchema,
  team_id: idSchema,
  shirt_number: z.string().nullable(),
}) satisfies z.ZodType<ApiTeamMembership>;

export const apiTeamMembershipsSchema = z.array(apiTeamMembershipSchema);

export const playerFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio.")
    .email("Ingresa un correo valido."),
  phone: z.string().trim().regex(/^\d*$/, "El telefono solo debe contener numeros."),
  teamIds: z.array(z.number().int()),
}) satisfies z.ZodType<PlayerFormValues>;

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
    const teamNames = teamIds.map((teamId) => teamById.get(teamId)?.name ?? `Equipo #${teamId}`);

    return {
      id: player.id,
      name: player.name,
      email: player.email,
      phone: player.phone === null ? "" : String(player.phone),
      teamIds,
      teamNames,
      teamLabel: teamNames.length > 0 ? teamNames.join(", ") : "Sin equipo",
      teamsCount: teamNames.length,
      status: getPlayerStatus(teamIds),
    };
  });
}

export function toPlayerFormValues(player?: PlayerListItem | null, defaultTeamIds: number[] = []): PlayerFormValues {
  if (player) {
    return {
      name: player.name,
      email: player.email,
      phone: player.phone,
      teamIds: sanitizeTeamIds(player.teamIds),
    };
  }

  return {
    name: "",
    email: "",
    phone: "",
    teamIds: sanitizeTeamIds(defaultTeamIds),
  };
}

export function toPlayerMutationPayload(values: PlayerFormValues): PlayerMutationPayload {
  const normalizedValues = playerFormSchema.parse(values);
  const normalizedPhone = normalizedValues.phone.trim();

  return {
    name: normalizedValues.name.trim(),
    email: normalizedValues.email.trim().toLowerCase(),
    phone: normalizedPhone ? Number(normalizedPhone) : null,
    team_ids: sanitizeTeamIds(normalizedValues.teamIds),
  };
}
