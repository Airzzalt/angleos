// Cleans a lesson transcript and splits it into searchable chunks.

export type QualityFlag = { kind: string; note: string };

/** Strips subtitle timestamps/cues and repeated caption lines, then wraps into paragraphs. */
export function cleanTranscript(raw: string): string {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .replace(/^﻿/, "")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return true;
      if (/^WEBVTT/i.test(l) || /^(NOTE|STYLE|Kind:|Language:)\b/.test(l)) return false;
      if (/^\d+$/.test(l)) return false; // cue numbers
      if (/^\d{1,2}:\d{2}(:\d{2})?[.,]\d{1,3}\s*-->/.test(l)) return false; // 00:00:01.000 --> 00:00:03.000
      return true;
    })
    .map((l) => l.replace(/<[^>]+>/g, "").replace(/\[\d{1,2}:\d{2}(:\d{2})?\]/g, "").trim());

  // Drop a line identical to the one before it (auto-captions repeat lines).
  const out: string[] = [];
  let prev = "";
  for (const l of lines) {
    if (l && l === prev) continue;
    out.push(l);
    if (l) prev = l;
  }
  // Join caption fragments into paragraphs: blank lines separate; single lines are merged.
  const paras: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) paras.push(buf.join(" ").replace(/\s+/g, " ").trim());
    buf = [];
  };
  for (const l of out) {
    if (!l) flush();
    else buf.push(l);
  }
  flush();
  // Very long single paragraphs are cut into readable ones (roughly every 120 words at a sentence end).
  const final: string[] = [];
  for (const p of paras) {
    const words = p.split(" ");
    if (words.length <= 160) {
      final.push(p);
      continue;
    }
    const sentences = p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [p];
    let cur = "";
    for (const s of sentences) {
      cur += s;
      if (cur.split(" ").length >= 110) {
        final.push(cur.trim());
        cur = "";
      }
    }
    if (cur.trim()) final.push(cur.trim());
  }
  return final.join("\n\n").trim();
}

/** Flags passages that look like transcription glitches so an admin can review them. */
export function detectGlitches(clean: string): QualityFlag[] {
  const flags: QualityFlag[] = [];
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length < 40) flags.push({ kind: "short", note: `Only ${words.length} words; the export may be incomplete.` });
  // A word repeated 6+ times in a row.
  if (/\b(\w{2,})(?:\s+\1\b){5,}/i.test(clean)) flags.push({ kind: "repeat", note: "A word repeats many times in a row (likely garbled audio)." });
  // The tail of the lesson being mostly non-words (the export of one lesson ended in garbled text).
  const tail = words.slice(-60);
  if (tail.length >= 30) {
    const odd = tail.filter((w) => !/^[A-Za-z'’\-.,!?;:"()0-9$%]+$/.test(w) || /(.)\1{4,}/.test(w)).length;
    if (odd / tail.length > 0.25) flags.push({ kind: "garbled-end", note: "The end of the lesson looks garbled." });
  }
  if (/\[(inaudible|music|noise)\]/i.test(clean)) flags.push({ kind: "inaudible", note: "Contains [inaudible] or similar markers." });
  return flags;
}

/** Splits text into overlapping chunks of about `target` words, breaking at paragraph edges where possible. */
export function chunkText(clean: string, target = 380, overlap = 60): string[] {
  const paras = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let words: string[] = [];
  const push = () => {
    if (words.length) chunks.push(words.join(" "));
  };
  for (const p of paras) {
    const pw = p.split(/\s+/);
    if (words.length && words.length + pw.length > target * 1.25) {
      push();
      words = words.slice(-overlap);
    }
    words = words.concat(pw);
    while (words.length > target * 1.6) {
      chunks.push(words.slice(0, target).join(" "));
      words = words.slice(target - overlap);
    }
  }
  if (words.length > overlap || !chunks.length) push();
  return chunks;
}

/** "1._Introduction_01_-_The_Skill_Stacking_Effect.txt" -> { title, ref } */
export function titleFromFileName(fileName: string): { title: string; ref: string } {
  const base = fileName.replace(/^.*[\\/]/, "").replace(/\.(txt|vtt|srt|md)$/i, "");
  const spaced = base.replace(/_-_/g, " - ").replace(/_/g, " ").replace(/\s+/g, " ").trim();
  const m = /^(.*?)\s(\d{1,3})\s-\s(.+)$/.exec(spaced);
  if (m) return { title: m[3].trim(), ref: `${m[1].replace(/^\d+\.\s*/, "").trim()} ${m[2]}`.trim() };
  return { title: spaced, ref: "" };
}
