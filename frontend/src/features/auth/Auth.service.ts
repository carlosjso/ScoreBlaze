import type { ZodType } from "zod";

import type { AuthSession } from "@/features/auth/Auth.types";
import { apiAuthSessionSchema } from "@/features/auth/schemas/Auth.schema";
import { apiClient, toApiRequestError } from "@/shared/api/client";

export const authQueryKeys = {
  all: ["auth"] as const,
  session: () => [...authQueryKeys.all, "session"] as const,
};

async function requestJson<T>(
  request: Promise<{ data: unknown }>,
  schema: ZodType<T>,
  invalidMessage: string,
): Promise<T> {
  try {
    const response = await request;
    return schema.parse(response.data);
  } catch (error) {
    throw toApiRequestError(error, invalidMessage);
  }
}

async function requestVoid(request: Promise<unknown>, fallbackMessage: string): Promise<void> {
  try {
    await request;
  } catch (error) {
    throw toApiRequestError(error, fallbackMessage);
  }
}

export const authService = {
  async getSession(signal?: AbortSignal): Promise<AuthSession | null> {
    try {
      return await requestJson(
        apiClient.get("/auth/me", { signal }),
        apiAuthSessionSchema,
        "La sesión actual es inválida.",
      );
    } catch (error) {
      const normalizedError = toApiRequestError(error, "No se pudo obtener la sesión.");
      if (normalizedError.status === 401) {
        return null;
      }
      throw normalizedError;
    }
  },

  async touch(signal?: AbortSignal): Promise<AuthSession | null> {
    try {
      return await requestJson(
        apiClient.post("/auth/touch", {}, { signal }),
        apiAuthSessionSchema,
        "La sesión actual es inválida.",
      );
    } catch (error) {
      const normalizedError = toApiRequestError(error, "No se pudo refrescar la sesión.");
      if (normalizedError.status === 401) {
        return null;
      }
      throw normalizedError;
    }
  },

  login(payload: { email: string; password: string }, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/auth/login", payload, { signal }),
      apiAuthSessionSchema,
      "La respuesta de inicio de sesión es inválida.",
    );
  },

  register(payload: { name: string; email: string; password: string }, signal?: AbortSignal) {
    return requestJson(
      apiClient.post("/auth/register", payload, { signal }),
      apiAuthSessionSchema,
      "La respuesta de registro es inválida.",
    );
  },

  logout(signal?: AbortSignal) {
    return requestVoid(apiClient.post("/auth/logout", {}, { signal }), "No se pudo cerrar la sesión.");
  },
};
