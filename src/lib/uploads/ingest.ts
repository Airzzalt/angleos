// Takes one upload (a zip or a single document) and stores the extracted text for a project.
import { createHash } from "node:crypto";
import { query } from "../db";
import { LIMITS } from "./limits";
import { DOC_EXTENSIONS, ExtractError, ZipLimitError, extOf, extractText, isZipMagic, readZip, safeName } from "./extract";

export type IngestResult = {
  ok: boolean;
  message: string;
  added: number;
  duplicates: number;
  skipped: { name: string; reason: string }[];
};

type Who = { id: string; role: "admin" | "member" };

/** Which entries inside a zip we even try to read. Returns a reason to skip, or null to read it. */
function acceptEntry(name: string): string | null {
  const base = name.split("/").pop() ?? name;
  if (name.startsWith("__MACOSX/") || base.startsWith(".") || base.toLowerCase() === "thumbs.db") return "system file";
  const ext = extOf(base);
  if (ext === "zip") return "zip inside a zip is not opened";
  if (!DOC_EXTENSIONS.includes(ext)) return `unsupported type${ext ? ` (.${ext})` : ""}`;
  return null;
}

export async function ingestUpload(who: Who, projectId: string, rawName: string, bytes: Uint8Array): Promise<IngestResult> {
  const fileName = safeName(rawName);
  const fail = (message: string): IngestResult => ({ ok: false, message, added: 0, duplicates: 0, skipped: [] });
  if (bytes.length === 0) return fail(`${fileName}: the file is empty`);
  if (bytes.length > LIMITS.maxUploadBytes) return fail(`${fileName}: too large (over ${LIMITS.maxUploadBytes / 1024 / 1024} MB)`);

  // Collect the documents to read.
  let docs: { name: string; data: Uint8Array; zip: string | null }[] = [];
  const skipped: { name: string; reason: string }[] = [];
  const ext = extOf(fileName);
  if (ext === "zip") {
    if (!isZipMagic(bytes)) return fail(`${fileName}: not a real zip file`);
    try {
      const z = readZip(bytes, acceptEntry, {
        maxEntries: LIMITS.maxZipEntries,
        maxTotal: LIMITS.maxUnpackedBytes,
        maxFile: LIMITS.maxFileBytes,
        maxRatio: LIMITS.maxRatio,
      });
      docs = z.entries.map((e) => ({ name: safeName(e.name), data: e.data, zip: fileName }));
      skipped.push(...z.skipped.filter((s) => s.reason !== "system file"));
    } catch (e) {
      if (e instanceof ZipLimitError || e instanceof ExtractError) return fail(`${fileName}: ${e.message}`);
      throw e;
    }
  } else {
    docs = [{ name: fileName, data: bytes, zip: null }];
  }

  // Running totals so limits hold even inside one big zip.
  const proj = await query<{ chars: string; files: string }>(
    "select coalesce(sum(char_count),0) as chars, count(*) as files from project_files where project_id = $1",
    [projectId],
  );
  let projChars = Number(proj.rows[0]?.chars ?? 0);
  let projFiles = Number(proj.rows[0]?.files ?? 0);
  let userChars = 0;
  if (who.role !== "admin") {
    const u = await query<{ chars: string }>("select coalesce(sum(char_count),0) as chars from project_files where owner_id = $1", [who.id]);
    userChars = Number(u.rows[0]?.chars ?? 0);
  }

  let added = 0;
  let duplicates = 0;
  for (const d of docs) {
    if (projFiles >= LIMITS.maxFilesPerProject) {
      skipped.push({ name: d.name, reason: `project already has ${LIMITS.maxFilesPerProject} files` });
      continue;
    }
    try {
      const sha = createHash("sha256").update(d.data).digest("hex");
      const dup = await query("select 1 from project_files where project_id = $1 and sha256 = $2", [projectId, sha]);
      if (dup.rows.length) {
        duplicates++;
        continue;
      }
      const ex = await extractText(d.name, d.data, {
        maxChars: LIMITS.maxCharsPerFile,
        maxPdfPages: LIMITS.maxPdfPages,
        maxFileBytes: LIMITS.maxFileBytes,
      });
      if (ex.text.length < 20) {
        skipped.push({ name: d.name, reason: "no readable text (a scanned image PDF?)" });
        continue;
      }
      if (projChars + ex.text.length > LIMITS.maxCharsPerProject) {
        skipped.push({ name: d.name, reason: "project text limit reached" });
        continue;
      }
      if (who.role !== "admin" && userChars + ex.text.length > LIMITS.maxCharsPerMember) {
        skipped.push({ name: d.name, reason: "your storage limit is reached" });
        continue;
      }
      const flags = ex.truncated ? [{ kind: "truncated", note: `Only the first ${LIMITS.maxCharsPerFile.toLocaleString()} characters were kept.` }] : [];
      const words = ex.text.split(/\s+/).filter(Boolean).length;
      await query(
        `insert into project_files (owner_id, project_id, file_name, file_type, size_bytes, char_count, word_count, sha256, extracted_text, flags, source_zip)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [who.id, projectId, d.name, ex.type, d.data.length, ex.text.length, words, sha, ex.text, JSON.stringify(flags), d.zip],
      );
      projChars += ex.text.length;
      userChars += ex.text.length;
      projFiles++;
      added++;
    } catch (e) {
      skipped.push({ name: d.name, reason: e instanceof ExtractError ? e.message : "couldn't be read" });
    }
  }
  if (added > 0) await query("update projects set updated_at = now() where id = $1", [projectId]);

  const parts = [`${added} file${added === 1 ? "" : "s"} added`];
  if (duplicates) parts.push(`${duplicates} already there`);
  if (skipped.length) parts.push(`${skipped.length} skipped`);
  return { ok: added > 0 || duplicates > 0, message: `${fileName}: ${parts.join(", ")}`, added, duplicates, skipped };
}
