/** Shows a search snippet where matches are wrapped in << >> (see searchBrain). */
export function Snippet({ text }: { text: string }) {
  const parts = text.replace(/\s+/g, " ").split(/(<<.*?>>)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("<<") ? (
          <mark key={i} className="rounded bg-accent-soft px-0.5 text-fg">
            {p.slice(2, -2)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}
