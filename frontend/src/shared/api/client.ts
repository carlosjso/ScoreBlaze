import axios from "axios";
import { ZodError } from "zod";

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseURL =
  typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim()
    ? rawApiBaseUrl.replace(/\/+$/, "")
    : undefined;

export const apiClient = axios.create({
  baseURL,
  headers: {
    Accept: "application/json",
  },
});

export function getApiErrorMessage(error: unknown, fallbackMessage = "Error inesperado en la API."): string {
  if (error instanceof ZodError) {
    return fallbackMessage;
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string" && data.trim()) {
      return data;
    }

    if (data && typeof data === "object" && "detail" in data && typeof data.detail === "string" && data.detail.trim()) {
      return data.detail;
    }

    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}
