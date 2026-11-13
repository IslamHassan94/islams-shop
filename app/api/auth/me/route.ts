import { getCustomer, getSession } from "@/lib/auth";
import { errorResponse, json } from "@/lib/http";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return json({ error: "Not logged in", code: "UNAUTHORIZED" }, 401);
    return json(await getCustomer(session.customerId));
  } catch (e) {
    return errorResponse(e);
  }
}
