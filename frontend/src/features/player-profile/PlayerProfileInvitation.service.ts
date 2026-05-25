import { z } from "zod";

import { apiClient, toApiRequestError } from "@/shared/api/client";

export type AccountInvitation = {
  userId: number;
  name: string;
  email: string;
  role: string;
  playerId: number | null;
  teamId: number | null;
  requiresPlayerProfile: boolean;
};

export type CompleteAccountInvitationPayload = {
  token: string;
  password: string;
  phone: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  nationality: string | null;
  favorite_position: string | null;
  photo_base64: string | null;
};

const accountInvitationSchema = z
  .object({
    user_id: z.coerce.number().int().positive(),
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    role: z.string().trim().min(1),
    player_id: z.coerce.number().int().positive().nullable().optional(),
    team_id: z.coerce.number().int().positive().nullable().optional(),
    requires_player_profile: z.boolean().default(false),
  })
  .transform((invitation): AccountInvitation => ({
    userId: invitation.user_id,
    name: invitation.name,
    email: invitation.email,
    role: invitation.role,
    playerId: invitation.player_id ?? null,
    teamId: invitation.team_id ?? null,
    requiresPlayerProfile: invitation.requires_player_profile,
  }));

async function requestJson<T>(
  request: Promise<{ data: unknown }>,
  schema: z.ZodType<T>,
  invalidMessage: string,
): Promise<T> {
  try {
    const response = await request;
    return schema.parse(response.data);
  } catch (error) {
    throw toApiRequestError(error, invalidMessage);
  }
}

export const accountInvitationService = {
  validate(token: string, signal?: AbortSignal) {
    return requestJson(
      apiClient.get("/account-invitations/validate", {
        signal,
        params: { token },
      }),
      accountInvitationSchema,
      "La invitacion es invalida.",
    );
  },

  async complete(payload: CompleteAccountInvitationPayload) {
    try {
      await apiClient.post("/account-invitations/complete", payload);
    } catch (error) {
      throw toApiRequestError(error, "No se pudo completar la invitacion.");
    }
  },
};
