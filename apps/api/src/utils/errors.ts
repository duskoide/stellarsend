import type { Context } from "hono";
import type { ApiError } from "@stellarsend/shared";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new HttpError(400, "bad_request", msg, details);
export const unauthorized = (msg = "Unauthorized") =>
  new HttpError(401, "unauthorized", msg);
export const notFound = (msg = "Not found") =>
  new HttpError(404, "not_found", msg);
export const conflict = (msg: string) => new HttpError(409, "conflict", msg);

// Central error handler for the Hono app.
export function onError(err: Error, c: Context) {
  if (err instanceof HttpError) {
    const body: ApiError = {
      error: err.code,
      message: err.message,
      details: err.details,
    };
    return c.json(body, err.status as 400);
  }
  console.error("Unhandled error:", err);
  const body: ApiError = {
    error: "internal_error",
    message: "Something went wrong",
  };
  return c.json(body, 500);
}
