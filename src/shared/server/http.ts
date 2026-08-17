import "server-only";

import { ZodError, type ZodType } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code = "REQUEST_ERROR",
  ) {
    super(message);
  }
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  try {
    return schema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpError(400, "Data permintaan tidak valid.", "VALIDATION_ERROR");
    }
    throw new HttpError(400, "Body JSON tidak valid.", "INVALID_JSON");
  }
}

export function apiError(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error(error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan pada server." } },
    { status: 500 },
  );
}

export function getRequestIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
}

/** 429 response carrying the standard hint for when to try again. */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return Response.json(
    { error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan. Coba lagi sebentar." } },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
