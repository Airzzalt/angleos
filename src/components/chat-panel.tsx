"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; text: string };

const suggestions = ["What should I do first on this screen?", "Explain this like I'm new", "Summarise this project"];

// Placeholder chat: the real AI is connected in a later phase. The layout and behaviour are final.
export function ChatPanel({ open, onClose, screen }: { open: boolean; onClose: () => void; screen: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (messages.length || typing) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, typing]);
  useEffect(() => () => clearTimeout(timer.current), []);

  function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;
    setMessages((m) => [...m, { role: "user", text: t }]);
    setDraft("");
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "This is a preview of the chat. In a later phase I'll answer here using this screen, your project's context and your course playbook, and show which rules I used.",
        },
      ]);
    }, 1100);
  }

  return (
    <div className={cn("fixed inset-0 z-50", open ? "visible" : "invisible delay-300")} aria-hidden={!open}>
      <div
        className={cn(
          "absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-label="AI chat"
        className={cn(
          "glass absolute bottom-2 right-2 top-2 flex w-[calc(100%-1rem)] max-w-[430px] flex-col overflow-hidden rounded-[30px]",
          "transition-[transform,opacity] duration-[380ms] ease-[var(--ease-sheet)]",
          open ? "translate-x-0 opacity-100" : "translate-x-[108%] opacity-0",
        )}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-border px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent),var(--accent-2))] text-white shadow-[0_6px_20px_-6px_var(--accent)]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold">Ask AI</p>
              <p className="text-xs text-muted">Context: {screen}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close chat">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="pt-6 text-center">
              <span className="float mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-[0_8px_30px_-8px_var(--accent)]">
                <Sparkles className="h-6 w-6" />
              </span>
              <p className="text-[15px] font-medium">Ask anything about this screen</p>
              <p className="mx-auto mt-1 max-w-[280px] text-sm text-muted">
                The chat will know your project, your context and the playbook rules.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{ "--i": i + 1 } as React.CSSProperties}
                    className="reveal rounded-2xl border border-border bg-surface-2 px-4 py-3 text-left text-sm transition-[transform,background-color,border-color] duration-200 hover:border-border-strong hover:bg-surface-3 active:scale-[0.98]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "pop-in max-w-[88%] rounded-[22px] px-4 py-2.5 text-[15px]",
                  m.role === "user"
                    ? "ml-auto origin-bottom-right bg-[linear-gradient(180deg,color-mix(in_srgb,var(--accent)_82%,white),var(--accent))] text-white"
                    : "origin-bottom-left bg-surface-2",
                )}
              >
                {m.text}
              </div>
            ))
          )}
          {typing && (
            <div className="pop-in flex w-fit origin-bottom-left gap-1.5 rounded-[22px] bg-surface-2 px-4 py-3.5" role="status" aria-label="AI is typing">
              {[0, 1, 2].map((d) => (
                <span key={d} className="typing-dot h-2 w-2 rounded-full bg-muted" style={{ animationDelay: `${d * 160}ms` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="shrink-0 border-t border-border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <div className="flex items-end gap-2 rounded-full border border-border bg-surface-2 p-1.5 transition-[border-color,box-shadow] duration-200 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Message…"
              aria-label="Message"
              className="h-10 min-w-0 flex-1 bg-transparent px-4 text-[15px] placeholder:text-muted/70 focus:outline-none"
            />
            <Button type="submit" size="icon-sm" disabled={!draft.trim() || typing} aria-label="Send">
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted">Preview only · AI is connected in a later phase</p>
        </form>
      </section>
    </div>
  );
}
