// Applies the .sql files in db/migrations, in name order, once each.
import fs from "node:fs/promises";
import path from "node:path";
import type { Db } from "./db";

export async function runMigrations(db: Db) {
  await db.exec(
    `create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`,
  );
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));

  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    // Whole file plus its "done" marker run as one all-or-nothing step.
    await db.exec(`begin;\n${sql}\ninsert into schema_migrations (name) values ('${file}');\ncommit;`);
    console.log(`[angleos] applied migration ${file}`);
  }
}
