// Runs in the browser: opens a zip on the person's own computer so the server never receives a big zip.
// The server still checks every file it gets, so this is only about size and speed, not trust.
import { unzip } from "fflate";
import { ALLOWED_EXTENSIONS, LIMITS } from "./limits";

export type Unpacked = { files: File[]; skipped: { name: string; reason: string }[] };

function skipReason(name: string): string | null {
  const parts = name.split("/");
  const base = parts[parts.length - 1];
  if (!base) return "folder";
  if (name.startsWith("__MACOSX/") || parts.some((p) => p.startsWith(".")) || base.toLowerCase() === "thumbs.db") return "system file";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  if (ext === "zip") return "zip inside a zip is not opened";
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) return `unsupported type${ext ? ` (.${ext})` : ""}`;
  return null;
}

export async function unpackZipInBrowser(zip: File): Promise<Unpacked> {
  if (zip.size > LIMITS.maxBrowserZipBytes) throw new Error(`${zip.name} is over ${LIMITS.maxBrowserZipBytes / 1024 / 1024} MB. Split it into smaller zips.`);
  const data = new Uint8Array(await zip.arrayBuffer());
  const skipped: Unpacked["skipped"] = [];
  let seen = 0;
  const out = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(
      data,
      {
        filter: (f) => {
          seen++;
          if (seen > LIMITS.maxBrowserZipEntries) {
            if (seen === LIMITS.maxBrowserZipEntries + 1) skipped.push({ name: "(rest of the zip)", reason: `more than ${LIMITS.maxBrowserZipEntries} files` });
            return false;
          }
          const why = skipReason(f.name);
          if (why) {
            if (why !== "folder") skipped.push({ name: f.name, reason: why });
            return false;
          }
          if (f.originalSize > LIMITS.maxFileBytes) {
            skipped.push({ name: f.name, reason: "file too large" });
            return false;
          }
          return true;
        },
      },
      (err, res) => (err ? reject(err) : resolve(res)),
    );
  });
  const files = Object.entries(out).map(([name, bytes]) => {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return new File([copy], name);
  });
  return { files, skipped };
}
