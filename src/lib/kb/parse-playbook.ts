// Turns one playbook file (a .md module) into a module plus its numbered rules.
// Rules start with a heading like "### HOOK-04 Three seconds, first frame". Other headings are just sub-headings.

export type ParsedRule = { code: string; title: string; body: string; flags: string[]; position: number };
export type ParsedModule = {
  code: string;
  title: string;
  usedBy: string;
  kind: "rules" | "workflow";
  intro: string;
  body: string;
  rules: ParsedRule[];
};

const RULE_HEADING = /^###\s+([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d+)\s+(.+?)\s*$/;
const FLAGS = ["INFERRED", "UNCLEAR", "CONFLICT", "CHECK NUMBER", "UNVERIFIED"];

export function moduleCodeFromFile(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, "").replace(/\.md$/i, "").trim();
}

export function findFlags(text: string): string[] {
  return FLAGS.filter((f) => text.includes(`[${f}]`));
}

export function parsePlaybook(fileName: string, text: string): ParsedModule {
  const src = text.replace(/\r\n?/g, "\n").trim();
  const lines = src.split("\n");
  const code = moduleCodeFromFile(fileName);

  const h1 = lines.find((l) => /^#\s+/.test(l));
  const title = (h1 ? h1.replace(/^#\s+/, "") : code).replace(/:\s.*$/, (m) => m).trim();
  const usedBy = (lines.find((l) => /^\*\*Used by:\*\*/.test(l)) ?? "").replace(/^\*\*Used by:\*\*\s*/, "").trim();

  const rules: ParsedRule[] = [];
  let cur: { code: string; title: string; lines: string[] } | null = null;
  const intro: string[] = [];
  const close = () => {
    if (!cur) return;
    const body = cur.lines.join("\n").trim();
    rules.push({ code: cur.code, title: cur.title, body, flags: findFlags(body + " " + cur.title), position: rules.length });
    cur = null;
  };
  for (const line of lines) {
    const m = RULE_HEADING.exec(line);
    if (m) {
      close();
      cur = { code: m[1], title: m[2], lines: [] };
    } else if (cur) {
      // A new "##" section ends the current rule.
      if (/^##\s/.test(line)) close();
      else cur.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  close();

  return {
    code,
    title,
    usedBy,
    kind: rules.length ? "rules" : "workflow",
    intro: intro.join("\n").trim(),
    body: src,
    rules,
  };
}
