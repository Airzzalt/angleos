import { getSession } from "@/lib/auth";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

// The open app pings this about once a minute so the admin can see who is online.
export async function POST() {
  const user = await getSession();
  if (!user) return new Response(null, { status: 401 });
  await query(
    "update users set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '20 seconds')",
    [user.id],
  );
  return new Response(null, { status: 204 });
}
