import type { ReactNode } from "react";

/** A small, safe Markdown renderer for chat answers: headings, bullets, numbered lists, bold, dividers. It never uses raw HTML. */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4 ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong> : part,
  );
}

/** Older saved answers lost their blank lines, so put paragraph breaks back before headings and dividers. */
function tidy(raw: string): string {
  return raw
    .replace(/([^\n])[ \t]+(#{2,4} )/g, "$1\n\n$2")
    .replace(/([^\n])[ \t]+---[ \t]+/g, "$1\n\n---\n\n")
    .replace(/\r/g, "");
}

type Block = { kind: "h" | "p" | "hr" | "ul" | "ol"; text?: string; items?: { text: string; depth: number }[] };

export function parseMarkdown(raw: string): Block[] {
  const blocks: Block[] = [];
  for (const line of tidy(raw).split("\n")) {
    const t = line.trim();
    if (!t) { blocks.push({ kind: "p", text: "" }); continue; }
    const h = /^#{1,4}\s+(.*)$/.exec(t);
    if (h) { blocks.push({ kind: "h", text: h[1] }); continue; }
    if (/^-{3,}$/.test(t)) { blocks.push({ kind: "hr" }); continue; }
    const depth = Math.min(2, Math.floor((line.length - line.trimStart().length) / 2));
    const ul = /^[*\-•]\s+(.*)$/.exec(t);
    const ol = /^\d+[.)]\s+(.*)$/.exec(t);
    const kind = ul ? "ul" : ol ? "ol" : null;
    if (kind) {
      const last = blocks[blocks.length - 1];
      const item = { text: (ul ?? ol)![1], depth };
      if (last && last.kind === kind) last.items!.push(item);
      else blocks.push({ kind, items: [item] });
      continue;
    }
    const last = blocks[blocks.length - 1];
    if (last && last.kind === "p" && last.text) last.text += " " + t;
    else blocks.push({ kind: "p", text: t });
  }
  return blocks.filter((b) => b.kind !== "p" || b.text);
}

export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-2.5 break-words">
      {parseMarkdown(text).map((b, i) => {
        if (b.kind === "h") return <p key={i} className="pt-1 text-[15px] font-semibold">{inline(b.text!)}</p>;
        if (b.kind === "hr") return <hr key={i} className="border-border" />;
        if (b.kind === "ul" || b.kind === "ol") {
          const Tag = b.kind === "ul" ? "ul" : "ol";
          return (
            <Tag key={i} className={`space-y-1 pl-5 ${b.kind === "ul" ? "list-disc" : "list-decimal"}`}>
              {b.items!.map((it, j) => <li key={j} style={it.depth ? { marginLeft: it.depth * 16 } : undefined}>{inline(it.text)}</li>)}
            </Tag>
          );
        }
        return <p key={i}>{inline(b.text!)}</p>;
      })}
    </div>
  );
}
