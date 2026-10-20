// One small database door for the whole app.
//  - Real use (Neon): DATABASE_URL=postgresql://...   (uses the `pg` package)
//  - Local testing:   DATABASE_URL=pglite:memory       (a tiny in-memory Postgres, nothing to install)
import { Pool } from "pg";

type Row = Record<string, unknown>;

export type Db = {
  query<T extends Row = Row>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
  /** Run several SQL statements at once (used by migrations). */
  exec(sql: string): Promise<void>;
};

const g = globalThis as unknown as { __angleosDb?: Promise<Db> };

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");

  if (url.startsWith("pglite:")) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dir = url.slice("pglite:".length);
    const pg = dir && dir !== "memory" ? new PGlite(dir) : new PGlite();
    return {
      async query<T extends Row = Row>(text: string, params: unknown[] = []) {
        const res = await pg.query<T>(text, params);
        return { rows: res.rows };
      },
      async exec(sql: string) {
        await pg.exec(sql);
      },
    };
  }

  const pool = new Pool({ connectionString: url, max: 5 });
  return {
    async query<T extends Row = Row>(text: string, params: unknown[] = []) {
      const res = await pool.query(text, params);
      return { rows: res.rows as T[] };
    },
    async exec(sql: string) {
      await pool.query(sql);
    },
  };
}

export function getDb(): Promise<Db> {
  g.__angleosDb ??= create();
  return g.__angleosDb;
}

export async function query<T extends Row = Row>(text: string, params: unknown[] = []) {
  return (await getDb()).query<T>(text, params);
}
