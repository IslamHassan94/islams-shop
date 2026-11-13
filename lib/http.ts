import { NextResponse } from "next/server";
import { AuthError } from "./auth";
import { CheckoutError } from "./checkout";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

export function errorResponse(e: unknown) {
  if (e instanceof CheckoutError) return json({ error: e.message, code: e.code, details: e.details }, e.status);
  if (e instanceof AuthError) return json({ error: e.message, code: e.code }, e.status);
  console.error(e);
  return json({ error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" }, 500);
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    throw new CheckoutError("Request body must be valid JSON", 400, "INVALID_JSON");
  }
}
