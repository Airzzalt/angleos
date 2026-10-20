// Finds the "blanks" in a prompt that the app fills in: {{LIKE_THIS}}, [LIKE THIS], or INSERT PRODUCT URL / ANGLE 1.
export function findPlaceholders(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([A-Z0-9_ ]+?)\s*\}\}/g)) found.add(`{{${m[1]}}}`);
  for (const m of body.matchAll(/\[([A-Z][A-Z0-9 _/'-]{2,40})\]/g)) found.add(`[${m[1]}]`);
  for (const m of body.matchAll(/^\s*(INSERT [A-Z0-9 ]+|ANGLE \d+)\s*$/gm)) found.add(m[1].trim());
  return [...found].slice(0, 30);
}

/** "evolve-desire-prompt.txt" -> "evolve-desire-prompt" */
export function promptKeyFromFile(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, "").replace(/\.(txt|md)$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function promptTitleFromKey(key: string): string {
  return key.replace(/-prompts?$/, "").split("-").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ");
}
