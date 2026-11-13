import { db } from "@/lib/db";
import { json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  try {
    await db.query("SELECT 1 AS ok");
    return json({ status: "ok", db: "up", driver: process.env.DB_DRIVER ?? "dataapi", latencyMs: Date.now() - started });
  } catch (e) {
    return json({ status: "degraded", db: "down", error: (e as Error).message }, 503);
  }
}
