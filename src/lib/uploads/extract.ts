// Safe reading of uploads. Nothing is ever written to disk or executed: files are read in memory with hard limits,
// and only plain text is kept.
import { Unzip, UnzipInflate, UnzipPassThrough } from "fflate";

export class ExtractError extends Error {}
export class ZipLimitError extends Error {}

export const TEXT_EXTENSIONS = ["txt", "md", "markdown", "csv"];
export const DOC_EXTENSIONS = ["pdf", "docx", ...TEXT_EXTENSIONS];

export type ZipLimits = { maxEntries: number; maxTotal: number; maxFile: number; maxRatio: number };
export type ZipResult = { entries: { name: string; data: Uint8Array }[]; skipped: { name: string; reason: string }[] };

const concat = (parts: Uint8Array[], total: number) => {
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

/** Reads a zip in memory, stopping early if it grows past the limits (zip-bomb safe even if headers lie). */
export function readZip(bytes: Uint8Array, accept: (name: string) => string | null, lim: ZipLimits): ZipResult {
  const entries: ZipResult["entries"] = [];
  const skipped: ZipResult["skipped"] = [];
  let seen = 0;
  let total = 0;

  const uz = new Unzip((file) => {
    seen++;
    if (seen > lim.maxEntries) throw new ZipLimitError(`The zip has more than ${lim.maxEntries} files.`);
    const name = file.name;
    if (name.endsWith("/")) return; // folder
    const reason = accept(name);
    if (reason) {
      skipped.push({ name, reason });
      return;
    }
    const big = file.originalSize ?? 0;
    if (big > lim.maxFile) {
      skipped.push({ name, reason: "too large" });
      return;
    }
    if (big > MB1 && file.size && big / file.size > lim.maxRatio) {
      skipped.push({ name, reason: "suspicious compression" });
      return;
    }
    const parts: Uint8Array[] = [];
    let n = 0;
    let dead = false;
    file.ondata = (err, chunk, final) => {
      if (dead) return;
      if (err) {
        dead = true;
        skipped.push({ name, reason: "could not be read (damaged or password-protected)" });
        return;
      }
      n += chunk.length;
      total += chunk.length;
      if (total > lim.maxTotal) throw new ZipLimitError("The zip is too large once unpacked.");
      if (n > lim.maxFile) {
        dead = true;
        total -= n;
        file.terminate();
        skipped.push({ name, reason: "too large" });
        return;
      }
      parts.push(chunk);
      if (final) entries.push({ name, data: concat(parts, n) });
    };
    try {
      file.start();
    } catch {
      dead = true;
      skipped.push({ name, reason: "unsupported zip format" });
    }
  });
  uz.register(UnzipInflate);
  uz.register(UnzipPassThrough);
  try {
    uz.push(bytes, true);
  } catch (e) {
    if (e instanceof ZipLimitError) throw e;
    throw new ExtractError("That zip couldn't be read. It may be damaged or password-protected.");
  }
  return { entries, skipped };
}
const MB1 = 1024 * 1024;

export const extOf = (name: string) => (/\.([a-z0-9]+)$/i.exec(name)?.[1] ?? "").toLowerCase();

/** A clean display name: no folders that climb upward, no control characters, not too long. */
export function safeName(raw: string): string {
  const parts = raw
    .replace(/\\/g, "/")
    .split("/")
    .map((p) => p.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "").trim())
    .filter((p) => p && p !== "." && p !== "..");
  const s = parts.join("/").slice(-160);
  return s || "file";
}

export const isZipMagic = (b: Uint8Array) => b.length > 3 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
const isPdfMagic = (b: Uint8Array) => {
  const head = new TextDecoder("latin1").decode(b.subarray(0, 1024));
  return head.includes("%PDF-");
};

export function normalizeText(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => safeFromCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => safeFromCode(parseInt(d, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}
const safeFromCode = (n: number) => (n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "");

/** Pulls the readable text out of a .docx's main document XML. */
export function docxXmlToText(xml: string): string {
  return decodeEntities(
    xml
      .replace(/<w:tab\s*\/>/g, "\t")
      .replace(/<w:(br|cr)\b[^>]*\/>/g, "\n")
      .replace(/<\/w:tc>/g, "\t")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

export type Extracted = { text: string; type: string; truncated: boolean };
export type ExtractLimits = { maxChars: number; maxPdfPages: number; maxFileBytes: number };

function decodeText(bytes: Uint8Array): string {
  if (bytes.subarray(0, 8192).includes(0)) throw new ExtractError("looks like a binary file, not text");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

export async function extractText(name: string, bytes: Uint8Array, lim: ExtractLimits): Promise<Extracted> {
  const ext = extOf(name);
  if (!DOC_EXTENSIONS.includes(ext)) throw new ExtractError(`unsupported file type${ext ? ` (.${ext})` : ""}`);
  if (bytes.length > lim.maxFileBytes) throw new ExtractError("too large");
  let text: string;

  if (ext === "pdf") {
    if (!isPdfMagic(bytes)) throw new ExtractError("not a real PDF");
    try {
      const { getDocumentProxy, extractText: pdfText } = await import("unpdf");
      const run = (async () => {
        const pdf = await getDocumentProxy(new Uint8Array(bytes));
        if (pdf.numPages > lim.maxPdfPages) throw new ExtractError(`more than ${lim.maxPdfPages} pages`);
        const out = await pdfText(pdf, { mergePages: true });
        return Array.isArray(out.text) ? out.text.join("\n") : out.text;
      })();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<never>((_, rej) => {
        timer = setTimeout(() => rej(new ExtractError("took too long to read")), 30_000);
      });
      try {
        text = await Promise.race([run, timeout]);
      } finally {
        clearTimeout(timer);
      }
    } catch (e) {
      if (e instanceof ExtractError) throw e;
      throw new ExtractError("couldn't be read (damaged or password-protected PDF)");
    }
  } else if (ext === "docx") {
    if (!isZipMagic(bytes)) throw new ExtractError("not a real Word file");
    let res: ZipResult;
    try {
      res = readZip(bytes, (n) => (n === "word/document.xml" ? null : "ignored"), {
        maxEntries: 3000,
        maxTotal: 25 * MB1,
        maxFile: 25 * MB1,
        maxRatio: 500,
      });
    } catch (e) {
      if (e instanceof ZipLimitError) throw new ExtractError("too large once opened");
      throw e;
    }
    const doc = res.entries.find((e) => e.name === "word/document.xml");
    if (!doc) throw new ExtractError("not a readable Word file");
    text = docxXmlToText(new TextDecoder("utf-8").decode(doc.data));
  } else {
    text = decodeText(bytes);
  }

  text = normalizeText(text);
  let truncated = false;
  if (text.length > lim.maxChars) {
    text = text.slice(0, lim.maxChars);
    truncated = true;
  }
  return { text, type: ext === "markdown" ? "md" : ext, truncated };
}
