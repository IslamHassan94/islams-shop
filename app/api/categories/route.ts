import { listCategories } from "@/lib/catalog";
import { errorResponse, json } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return json(await listCategories());
  } catch (e) {
    return errorResponse(e);
  }
}
