import { z } from "zod";

import { buildPaginatedResponseSchema } from "@/shared/api/pagination";
import type { RoleFormValues, RoleListItem, RoleMutationPayload } from "@/features/roles/Roles.types";

const idSchema = z.coerce.number().int().positive();
type RoleFormFieldName = Extract<keyof RoleFormValues, string>;

export const ROLE_FORM_LIMITS = {
  name: 100,
} as const;

export const apiRoleSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    user_count: z.coerce.number().int().min(0),
    is_system: z.coerce.boolean(),
  })
  .transform(
    (role): RoleListItem => ({
      id: role.id,
      name: role.name,
      userCount: role.user_count,
      isSystem: role.is_system,
    }),
  );

export const apiRolesSchema = z.array(apiRoleSchema);
export const apiPaginatedRolesTableSchema = buildPaginatedResponseSchema(apiRoleSchema);

export const roleFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del rol es obligatorio.")
    .max(ROLE_FORM_LIMITS.name, "El nombre del rol no puede exceder 100 caracteres."),
}) satisfies z.ZodType<RoleFormValues>;

export const roleFormApiFieldMap = {
  name: "name",
} satisfies Record<string, RoleFormFieldName>;

export const roleFormApiMessageFieldMap = {
  "Ya existe un rol con ese nombre.": "name",
} satisfies Record<string, RoleFormFieldName | readonly RoleFormFieldName[]>;

export function toRoleFormValues(role?: RoleListItem | null): RoleFormValues {
  return {
    name: role?.name ?? "",
  };
}

export function toRoleMutationPayload(values: RoleFormValues): RoleMutationPayload {
  const normalizedValues = roleFormSchema.parse(values);
  return {
    name: normalizedValues.name.trim(),
  };
}
