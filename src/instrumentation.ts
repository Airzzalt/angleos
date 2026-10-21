// Runs once when the server starts: makes sure the database tables exist.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { getDb } = await import("./lib/db");
    const { runMigrations } = await import("./lib/migrate");
    await runMigrations(await getDb());
    console.log("[angleos] database ready");
    (await import("./lib/ai/resume")).startResumer();
  } catch (err) {
    console.error("[angleos] database setup failed:", err instanceof Error ? err.message : err);
  }
}
