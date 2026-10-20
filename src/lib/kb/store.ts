// Database side of the knowledge base. Admin-only: callers must have run requireAdmin() first.
import { query } from "../db";
import { parsePlaybook } from "./parse-playbook";
import { chunkText, cleanTranscript, detectGlitches, titleFromFileName } from "./clean-lesson";
import { findPlaceholders, promptKeyFromFile, promptTitleFromKey } from "./prompt-blanks";

export const MAX_FILE_BYTES = 2_000_000;
export const TIER_LABEL: Record<number, string> = {
  1: "Tier 1 · instructor's structured lessons",
  2: "Tier 2 · Ad Creative Program",
  3: "Tier 3 · live Q&A calls",
};

export type ImportResult = { ok: boolean; message: string };

export async function importPlaybookFile(ownerId: string, fileName: string, text: string): Promise<ImportResult> {
  if (!/\.md$/i.test(fileName)) return { ok: false, message: `${fileName}: playbook files must be .md` };
  const m = parsePlaybook(fileName, text);
  const { rows } = await query<{ id: string }>(
    `insert into playbook_modules (owner_id, code, title, used_by, kind, intro_md, body_md)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (code) do update set title = excluded.title, used_by = excluded.used_by, kind = excluded.kind,
       intro_md = excluded.intro_md, body_md = excluded.body_md, version = playbook_modules.version + 1, updated_at = now()
     returning id`,
    [ownerId, m.code, m.title, m.usedBy, m.kind, m.intro, m.body],
  );
  const moduleId = rows[0].id;
  let added = 0,
    updated = 0,
    kept = 0;
  for (const r of m.rules) {
    const ex = await query<{ id: string; body_md: string; original_body_md: string }>(
      "select id, body_md, original_body_md from playbook_rules where rule_code = $1",
      [r.code],
    );
    if (!ex.rows[0]) {
      await query(
        `insert into playbook_rules (owner_id, module_id, rule_code, title, body_md, original_body_md, flags, position)
         values ($1,$2,$3,$4,$5,$5,$6,$7)`,
        [ownerId, moduleId, r.code, r.title, r.body, r.flags, r.position],
      );
      added++;
    } else if (ex.rows[0].body_md !== ex.rows[0].original_body_md) {
      // The admin edited this rule; keep the edit but refresh the stored original.
      await query("update playbook_rules set original_body_md = $2, title = $3, module_id = $4, position = $5 where id = $1", [
        ex.rows[0].id, r.body, r.title, moduleId, r.position,
      ]);
      kept++;
    } else {
      await query(
        `update playbook_rules set title=$2, body_md=$3, original_body_md=$3, flags=$4, module_id=$5, position=$6,
           version = version + 1, updated_at = now() where id = $1`,
        [ex.rows[0].id, r.title, r.body, r.flags, moduleId, r.position],
      );
      updated++;
    }
  }
  const bits = [`${added} new`, `${updated} refreshed`];
  if (kept) bits.push(`${kept} kept (you had edited them)`);
  return {
    ok: true,
    message: m.rules.length ? `${m.code}: ${m.rules.length} rules (${bits.join(", ")})` : `${m.code}: saved as a workflow guide (no numbered rules)`,
  };
}

export async function ensureCollection(ownerId: string, name: string, tier: number): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `insert into kb_collections (owner_id, name, authority_tier) values ($1,$2,$3)
     on conflict (name) do update set authority_tier = excluded.authority_tier returning id`,
    [ownerId, name.trim(), tier],
  );
  return rows[0].id;
}

export async function importLessonFile(ownerId: string, collectionId: string, fileName: string, raw: string): Promise<ImportResult> {
  if (!/\.(txt|vtt|srt|md)$/i.test(fileName)) return { ok: false, message: `${fileName}: use .txt, .vtt, .srt or .md (PDFs aren't supported yet)` };
  const coll = await query<{ authority_tier: number }>("select authority_tier from kb_collections where id = $1", [collectionId]);
  if (!coll.rows[0]) return { ok: false, message: "Choose a collection first." };
  const clean = cleanTranscript(raw);
  if (!clean) return { ok: false, message: `${fileName}: nothing readable in this file` };
  const flags = detectGlitches(clean);
  const { title, ref } = titleFromFileName(fileName);
  const words = clean.split(/\s+/).length;
  const doc = await query<{ id: string }>(
    `insert into kb_documents (owner_id, collection_id, title, lesson_ref, authority_tier, source_file_name, raw_text, clean_text, quality_flags, word_count)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (collection_id, source_file_name) do update set title = excluded.title, lesson_ref = excluded.lesson_ref,
       authority_tier = excluded.authority_tier, raw_text = excluded.raw_text, clean_text = excluded.clean_text,
       quality_flags = excluded.quality_flags, word_count = excluded.word_count, updated_at = now()
     returning id`,
    [ownerId, collectionId, title, ref, coll.rows[0].authority_tier, fileName, raw, clean, JSON.stringify(flags), words],
  );
  const id = doc.rows[0].id;
  await query("delete from kb_chunks where document_id = $1", [id]);
  const chunks = chunkText(clean);
  for (let i = 0; i < chunks.length; i++) {
    await query("insert into kb_chunks (owner_id, document_id, position, text) values ($1,$2,$3,$4)", [ownerId, id, i, chunks[i]]);
  }
  return { ok: true, message: `${title}: ${words} words, ${chunks.length} passages${flags.length ? `, ${flags.length} warning${flags.length > 1 ? "s" : ""}` : ""}` };
}

export async function importPromptFile(ownerId: string, fileName: string, body: string): Promise<ImportResult> {
  if (!/\.(txt|md)$/i.test(fileName)) return { ok: false, message: `${fileName}: prompts must be .txt or .md` };
  const text = body.replace(/\r\n?/g, "\n").trim();
  if (!text) return { ok: false, message: `${fileName}: empty file` };
  const key = promptKeyFromFile(fileName);
  const ph = findPlaceholders(text);
  const ex = await query<{ id: string; body: string; version: number }>("select id, body, version from admin_prompts where key = $1", [key]);
  if (!ex.rows[0]) {
    const ins = await query<{ id: string }>(
      `insert into admin_prompts (owner_id, key, title, placeholders, body, original_body) values ($1,$2,$3,$4,$5,$5) returning id`,
      [ownerId, key, promptTitleFromKey(key), ph, text],
    );
    await query("insert into admin_prompt_versions (owner_id, prompt_id, version_no, body, note) values ($1,$2,1,$3,'Imported')", [ownerId, ins.rows[0].id, text]);
    return { ok: true, message: `${key}: added` };
  }
  if (ex.rows[0].body === text) return { ok: true, message: `${key}: unchanged` };
  const v = ex.rows[0].version + 1;
  await query("update admin_prompts set body=$2, original_body=$2, placeholders=$3, version=$4, updated_at=now() where id=$1", [ex.rows[0].id, text, ph, v]);
  await query("insert into admin_prompt_versions (owner_id, prompt_id, version_no, body, note) values ($1,$2,$3,$4,'Re-imported')", [ownerId, ex.rows[0].id, v, text]);
  return { ok: true, message: `${key}: replaced with the new file (version ${v})` };
}

// ---- Search ("test the brain") ----
export type RuleHit = { code: string; title: string; module: string; snippet: string; rank: number };
export type PassageHit = { docTitle: string; collection: string; tier: number; ref: string; snippet: string; rank: number };
export type WorkflowHit = { code: string; title: string; snippet: string; rank: number };

const HL = "StartSel=<<, StopSel=>>, MaxWords=45, MinWords=20, MaxFragments=1";

export async function searchBrain(q: string, limit = 8) {
  const term = q.trim().slice(0, 300);
  if (!term) return { rules: [], passages: [], workflows: [] };
  // OR the words together so a natural question still finds something (websearch_to_tsquery would AND them).
  const orq = term.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2).slice(0, 14).join(" | ");
  if (!orq) return { rules: [], passages: [], workflows: [] };
  const rules = await query<RuleHit>(
    `select r.rule_code as code, r.title, m.code as module,
            ts_headline('english', r.body_md, to_tsquery('english', $1), $2) as snippet,
            ts_rank(r.tsv, to_tsquery('english', $1)) as rank
       from playbook_rules r join playbook_modules m on m.id = r.module_id
      where r.status = 'active' and m.active and r.tsv @@ to_tsquery('english', $1)
      order by rank desc limit $3`,
    [orq, HL, limit],
  );
  const passages = await query<PassageHit>(
    `select d.title as "docTitle", c.name as collection, d.authority_tier as tier, d.lesson_ref as ref,
            ts_headline('english', k.text, to_tsquery('english', $1), $2) as snippet,
            ts_rank(k.tsv, to_tsquery('english', $1)) as rank
       from kb_chunks k join kb_documents d on d.id = k.document_id join kb_collections c on c.id = d.collection_id
      where k.tsv @@ to_tsquery('english', $1)
      order by d.authority_tier asc, rank desc limit $3`,
    [orq, HL, limit],
  );
  const workflows = await query<WorkflowHit>(
    `select code, title, ts_headline('english', body_md, to_tsquery('english', $1), $2) as snippet,
            ts_rank(tsv, to_tsquery('english', $1)) as rank
       from playbook_modules where active and kind = 'workflow' and tsv @@ to_tsquery('english', $1)
      order by rank desc limit 3`,
    [orq, HL],
  );
  return { rules: rules.rows, passages: passages.rows, workflows: workflows.rows };
}

export async function kbStats() {
  const { rows } = await query<Record<string, string>>(
    `select (select count(*) from playbook_modules) as modules,
            (select count(*) from playbook_rules where status='active') as rules,
            (select count(*) from playbook_rules where status='off') as rules_off,
            (select count(*) from kb_documents) as lessons,
            (select count(*) from kb_chunks) as passages,
            (select count(*) from kb_documents where quality_flags <> '[]'::jsonb) as flagged,
            (select count(*) from admin_prompts) as prompts`,
  );
  const r = rows[0];
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)])) as Record<string, number>;
}
