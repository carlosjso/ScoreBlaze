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

type ApiFieldErrors = Record<string, string>;

const apiMessageTranslations: Record<string, string> = {
  "Team name already exists": "Ya existe un equipo con ese nombre.",
  "Email already exists": "Ya existe un jugador con ese correo.",
  "Invalid logo. Could not decode Base64": "No se pudo procesar el logo.",
  "Invalid photo. Could not decode Base64": "No se pudo procesar la foto.",
  "Start time must be earlier than end time": "La hora de inicio debe ser anterior a la hora de fin.",
  "Team A and Team B must be different": "El equipo local y visitante no pueden ser el mismo.",
  "Winner team must be Team A or Team B": "El ganador debe ser uno de los equipos del partido.",
  "Both scores must be provided together": "Captura ambos marcadores o deja ambos vacios.",
  "Winner team must be empty when draw is true": "Si el resultado es empate, no debe haber ganador.",
  "Winner team must be empty when scores are tied": "Si el marcador queda empatado, no debe haber ganador.",
  "Draw must be false when scores are different": "No puedes marcar empate si los marcadores son diferentes.",
  "Winner team does not match the scores": "El ganador no coincide con el marcador capturado.",
};

export class ApiRequestError extends Error {
  readonly fieldErrors: ApiFieldErrors;
  readonly globalMessage: string | null;
  readonly status: number | null;

  constructor(
    message: string,
    {
      fieldErrors = {},
      globalMessage = message,
      status = null,
    }: {
      fieldErrors?: ApiFieldErrors;
      globalMessage?: string | null;
      status?: number | null;
    } = {},
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.fieldErrors = fieldErrors;
    this.globalMessage = globalMessage;
    this.status = status;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function translateApiMessage(message: string, fieldName?: string | null): string {
  const translated = apiMessageTranslations[message];
  if (translated) {
    return translated;
  }

  const maxLengthMatch = message.match(/^String should have at most (\d+) characters$/);
  if (maxLengthMatch) {
    return `Este campo no puede exceder ${maxLengthMatch[1]} caracteres.`;
  }

  if (
    fieldName === "phone"
    && (
      message.includes("parse input string as an integer")
      || message.includes("valid integer")
      || message.includes("exceeded maximum size")
    )
  ) {
    return "El telefono excede el tamaño maximo permitido.";
  }

  if (
    (fieldName === "score_team_a" || fieldName === "score_team_b")
    && message.startsWith("Input should be less than or equal to")
  ) {
    return "El marcador no puede tener mas de 3 digitos.";
  }

  return message;
}

function getFieldNameFromLocation(loc: unknown): string | null {
  if (!Array.isArray(loc)) {
    return null;
  }

  const normalizedLoc = loc.filter(
    (part): part is string | number => typeof part === "string" || typeof part === "number",
  );

  if (normalizedLoc.length === 0) {
    return null;
  }

  const bodyIndex = normalizedLoc.findIndex((part) => part === "body");
  const relevantPath = bodyIndex >= 0 ? normalizedLoc.slice(bodyIndex + 1) : normalizedLoc;
  const firstFieldSegment = relevantPath.find(
    (part): part is string | number => typeof part === "string" || typeof part === "number",
  );

  return firstFieldSegment === undefined ? null : String(firstFieldSegment);
}

function extractFieldErrors(data: unknown): ApiFieldErrors {
  if (!isRecord(data)) {
    return {};
  }

  const collectedFieldErrors: ApiFieldErrors = {};

  const rawFieldErrors = data.field_errors;
  if (isRecord(rawFieldErrors)) {
    Object.entries(rawFieldErrors).forEach(([fieldName, rawMessage]) => {
      const message = getTrimmedString(rawMessage);
      if (message) {
        collectedFieldErrors[fieldName] = translateApiMessage(message, fieldName);
        return;
      }

      if (Array.isArray(rawMessage)) {
        const firstMessage = rawMessage
          .map((item) => getTrimmedString(item))
          .find((item): item is string => Boolean(item));

        if (firstMessage) {
          collectedFieldErrors[fieldName] = translateApiMessage(firstMessage, fieldName);
        }
      }
    });
  }

  const rawDetail = data.detail;
  if (!Array.isArray(rawDetail)) {
    return collectedFieldErrors;
  }

  rawDetail.forEach((detailItem) => {
    if (!isRecord(detailItem)) {
      return;
    }

    const fieldName = getFieldNameFromLocation(detailItem.loc);
    const rawMessage = getTrimmedString(detailItem.msg) ?? getTrimmedString(detailItem.message);
    const message = rawMessage ? translateApiMessage(rawMessage, fieldName) : null;

    if (!fieldName || !message || collectedFieldErrors[fieldName]) {
      return;
    }

    collectedFieldErrors[fieldName] = message;
  });

  return collectedFieldErrors;
}

function extractGlobalMessage(data: unknown): string | null {
  if (!isRecord(data)) {
    const message = getTrimmedString(data);
    return message ? translateApiMessage(message) : null;
  }

  const message = (
    getTrimmedString(data.message)
    ?? getTrimmedString(data.detail)
    ?? getTrimmedString(data.error)
    ?? null
  );

  return message ? translateApiMessage(message) : null;
}

export function toApiRequestError(
  error: unknown,
  fallbackMessage = "Error inesperado en la API.",
): ApiRequestError {
  if (error instanceof ApiRequestError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ApiRequestError(fallbackMessage, {
      globalMessage: fallbackMessage,
    });
  }

  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    const fieldErrors = extractFieldErrors(data);
    const globalMessage = extractGlobalMessage(data);
    const firstFieldMessage = Object.values(fieldErrors)[0] ?? null;
    const message = globalMessage ?? firstFieldMessage ?? error.message ?? fallbackMessage;

    return new ApiRequestError(message, {
      fieldErrors,
      globalMessage,
      status: error.response?.status ?? null,
    });
  }

  if (error instanceof Error && error.message.trim()) {
    return new ApiRequestError(error.message, {
      globalMessage: error.message,
    });
  }

  return new ApiRequestError(fallbackMessage, {
    globalMessage: fallbackMessage,
  });
}

export function getApiErrorMessage(error: unknown, fallbackMessage = "Error inesperado en la API."): string {
  return toApiRequestError(error, fallbackMessage).message;
}

export function getApiGlobalErrorMessage(
  error: unknown,
  fallbackMessage = "Error inesperado en la API.",
): string | null {
  if (error === null || error === undefined) {
    return null;
  }

  const normalizedError = toApiRequestError(error, fallbackMessage);
  return normalizedError.globalMessage;
}

export function mapApiErrorToForm<TField extends string>(
  error: unknown,
  fieldMap: Partial<Record<string, TField>>,
  messageMap: Partial<Record<string, TField | readonly TField[]>> = {},
  fallbackMessage = "Error inesperado en la API.",
): {
  fieldErrors: Partial<Record<TField, string>>;
  globalMessage: string | null;
} {
  if (error === null || error === undefined) {
    return {
      fieldErrors: {},
      globalMessage: null,
    };
  }

  const normalizedError = toApiRequestError(error, fallbackMessage);
  const fieldErrors: Partial<Record<TField, string>> = {};

  Object.entries(normalizedError.fieldErrors).forEach(([rawFieldName, message]) => {
    const mappedFieldName = fieldMap[rawFieldName];
    if (!mappedFieldName || fieldErrors[mappedFieldName]) {
      return;
    }

    fieldErrors[mappedFieldName] = message;
  });

  let globalMessage = normalizedError.globalMessage;
  if (globalMessage) {
    const mappedFields = messageMap[globalMessage];

    if (mappedFields) {
      const fieldMessage = globalMessage;
      const nextFields = (Array.isArray(mappedFields) ? mappedFields : [mappedFields]) as readonly TField[];
      nextFields.forEach((fieldName) => {
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = fieldMessage;
        }
      });
      globalMessage = null;
    }
  }

  return {
    fieldErrors,
    globalMessage,
  };
}
