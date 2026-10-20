import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// Used by Render to check the app is alive. Reveals nothing sensitive.
export async function GET() {
  try {
    await query("select 1");
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
