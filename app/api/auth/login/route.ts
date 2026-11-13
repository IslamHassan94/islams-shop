import { authenticate, createSessionCookie } from "@/lib/auth";
import { errorResponse, json, readJson } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const body = await readJson(req);
    const session = await authenticate(String(body.email ?? ""), String(body.password ?? ""));
    await createSessionCookie(session);
    return json({ customerId: session.customerId, email: session.email, firstName: session.firstName });
  } catch (e) {
    return errorResponse(e);
  }
}
