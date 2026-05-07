import { z } from "zod";

import type {
  UserFormMode,
  UserFormValues,
  UserListItem,
  UserMutationPayload,
} from "@/features/users/Users.types";
import { buildPaginatedResponseSchema } from "@/shared/api/pagination";

const idSchema = z.coerce.number().int().positive();
type UserFormFieldName = Extract<keyof UserFormValues, string>;

export const USER_FORM_LIMITS = {
  name: 250,
  password: 128,
} as const;

export const apiUserSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    roles: z.array(z.string().trim().min(1)),
    role_count: z.coerce.number().int().min(0),
    created_at: z.string().trim().min(1),
  })
  .transform(
    (user): UserListItem => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      roleCount: user.role_count,
      createdAt: user.created_at,
    }),
  );

export const apiUsersSchema = z.array(apiUserSchema);
export const apiPaginatedUsersTableSchema = buildPaginatedResponseSchema(apiUserSchema);

export const userFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre del usuario es obligatorio.")
    .max(USER_FORM_LIMITS.name, "El nombre del usuario no puede exceder 250 caracteres."),
  email: z
    .string()
    .trim()
    .min(1, "El correo es obligatorio.")
    .email("Captura un correo valido."),
  password: z
    .string()
    .max(USER_FORM_LIMITS.password, "La contraseña no puede exceder 128 caracteres.")
    .refine((value) => value.length === 0 || value.length >= 8, {
      message: "La contraseña debe tener al menos 8 caracteres.",
    }),
}) satisfies z.ZodType<UserFormValues>;

export const userFormApiFieldMap = {
  name: "name",
  email: "email",
  password: "password",
} satisfies Record<string, UserFormFieldName>;

export const userFormApiMessageFieldMap = {
  "Ya existe un correo registrado.": "email",
  "El nombre del usuario es obligatorio.": "name",
} satisfies Record<string, UserFormFieldName | readonly UserFormFieldName[]>;

export function toUserFormValues(user?: UserListItem | null): UserFormValues {
  return {
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
  };
}

export function toUserMutationPayload(values: UserFormValues, mode: UserFormMode): UserMutationPayload {
  const normalizedValues = userFormSchema.parse(values);
  const payload: UserMutationPayload = {
    name: normalizedValues.name.trim(),
    email: normalizedValues.email.trim().toLowerCase(),
  };

  if (mode === "create" || normalizedValues.password.length > 0) {
    payload.password = normalizedValues.password;
  }

  return payload;
}
