import { z } from "zod";

import type {
  PermissionFormValues,
  PermissionListItem,
  PermissionMutationPayload,
} from "@/features/permissions/Permissions.types";
import { buildPaginatedResponseSchema } from "@/shared/api/pagination";

const idSchema = z.coerce.number().int().positive();
type PermissionFormFieldName = Extract<keyof PermissionFormValues, string>;

export const PERMISSION_FORM_LIMITS = {
  name: 100,
} as const;

export const apiPermissionSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    role_count: z.coerce.number().int().min(0),
  })
  .transform(
    (permission): PermissionListItem => ({
      id: permission.id,
      name: permission.name,
      roleCount: permission.role_count,
    }),
  );

export const apiPermissionsSchema = z.array(apiPermissionSchema);
export const apiPaginatedPermissionsTableSchema = buildPaginatedResponseSchema(apiPermissionSchema);

export const permissionFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del permiso es obligatorio.")
    .max(PERMISSION_FORM_LIMITS.name, "El nombre del permiso no puede exceder 100 caracteres."),
}) satisfies z.ZodType<PermissionFormValues>;

export const permissionFormApiFieldMap = {
  name: "name",
} satisfies Record<string, PermissionFormFieldName>;

export const permissionFormApiMessageFieldMap = {
  "Ya existe un permiso con ese nombre.": "name",
} satisfies Record<string, PermissionFormFieldName | readonly PermissionFormFieldName[]>;

export function toPermissionFormValues(permission?: PermissionListItem | null): PermissionFormValues {
  return {
    name: permission?.name ?? "",
  };
}

export function toPermissionMutationPayload(values: PermissionFormValues): PermissionMutationPayload {
  const normalizedValues = permissionFormSchema.parse(values);
  return {
    name: normalizedValues.name.trim(),
  };
}
