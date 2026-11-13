import { createSessionCookie, registerCustomer, validateRegistration } from "@/lib/auth";
import { errorResponse, json, readJson } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const { errors, value } = validateRegistration(await readJson(req));
    if (Object.keys(errors).length)
      return json({ error: "Please fix the highlighted fields", code: "VALIDATION_ERROR", fieldErrors: errors }, 422);
    const session = await registerCustomer(value);
    await createSessionCookie(session);
    return json(session, 201);
  } catch (e) {
    return errorResponse(e);
  }
}
