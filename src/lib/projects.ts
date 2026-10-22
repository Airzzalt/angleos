// Project lookups. A person can see a project if they own it or are in its workspace.
import { query } from "./db";
import type { SessionUser } from "./auth";

export type Project = {
  id: string;
  owner_id: string;
  name: string;
  product_url: string;
  niche: string;
  market: string;
  description: string;
  status: string;
  kind: string;
  claim_level: string;
  created_at: string;
  updated_at: string;
};

export async function getProject(user: SessionUser, id: string): Promise<Project | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { rows } = await query<Project>(
    `select id, owner_id, name, product_url, niche, market, description, status, kind, claim_level, created_at, updated_at
       from projects where id = $1 and (owner_id = $2 or ($3::uuid is not null and workspace_id = $3::uuid))`,
    [id, user.id, user.workspaceId],
  );
  return rows[0] ?? null;
}

export { MARKETS } from "./markets";
