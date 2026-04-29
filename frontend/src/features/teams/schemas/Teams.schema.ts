import { z } from "zod";

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

export const teamFormSchema = z.object({
  name: z.string().trim().min(1, "El nombre del equipo es obligatorio."),
  responsibleName: z.string().trim().min(1, "El nombre del responsable es obligatorio."),
  responsiblePhone: z.string().trim().min(7, "El telefono del responsable es obligatorio."),
  responsibleEmail: z.string().trim().email("Escribe un correo valido."),
  logoBase64: z.string().nullable(),
  playerIds: z.array(z.number().int()),
}) satisfies z.ZodType<TeamFormValues>;

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

