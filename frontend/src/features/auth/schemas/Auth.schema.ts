import { z } from "zod";

import type { AuthSession, AuthUser, LoginFormValues, RegisterFormValues } from "@/features/auth/Auth.types";

const idSchema = z.coerce.number().int().positive();

export const apiAuthUserSchema = z
  .object({
    id: idSchema,
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    roles: z.array(z.string().trim().min(1)),
    permissions: z.array(z.string().trim().min(1)).default([]),
    created_at: z.string().trim().min(1),
  })
  .transform(
    (user): AuthUser => ({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      createdAt: user.created_at,
    }),
  );

export const apiAuthSessionSchema = z
  .object({
    user: apiAuthUserSchema,
  })
  .transform(
    (session): AuthSession => ({
      user: session.user,
    }),
  );

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "El correo es obligatorio.").email("Ingresa un correo válido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
}) satisfies z.ZodType<LoginFormValues>;

export const registerFormSchema = z
  .object({
    name: z.string().trim().min(1, "El nombre es obligatorio.").max(250, "El nombre no puede exceder 250 caracteres."),
    email: z.string().trim().min(1, "El correo es obligatorio.").email("Ingresa un correo válido."),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(128, "La contraseña es demasiado larga."),
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Las contraseñas no coinciden.",
  }) satisfies z.ZodType<RegisterFormValues>;

export const authLoginFieldMap = {
  email: "email",
  password: "password",
} as const;

export const authLoginMessageFieldMap = {
  "Correo o contraseña incorrectos.": ["email", "password"],
} as const;

export const authRegisterFieldMap = {
  name: "name",
  email: "email",
  password: "password",
} as const;

export const authRegisterMessageFieldMap = {
  "Ya existe un correo registrado.": "email",
} as const;
