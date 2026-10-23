"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, BookOpen, Loader2, Paperclip, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { FeedbackButtons } from "@/components/feedback-buttons";
import { deleteThreadAction, sendMentorAction } from "@/app/(app)/mentor/actions";

export type ChatMsg = { id: string; role: "user" | "assistant"; text: string; basis?: "kb" | "general" | ""; sources?: string[]; hasImage?: boolean; rating?: number };
export type ThreadRow = { id: string; title: string; source: string };

const BASIS_LABEL = { kb: "From our knowledge base", general: "General AI knowledge" } as const;
const STARTERS = ["Is my ad account ready to scale?", "What should I test next?", "Rate my metrics (attach a screenshot)"];

export function MentorChat({
  threads, threadId: initialThread, initialMessages, initialSource, initialProject, projects, isAdmin,
}: {
  threads: ThreadRow[]; threadId: string | null; initialMessages: ChatMsg[]; initialSource: "brand" | "kalorip"; initialProject: string; projects: { id: string; name: string }[]; isAdmin: boolean;
}) {
  const router = useRouter();
  const [threadId, setThreadId] = useState(initialThread);
  const [messages, setMessages] = useState<ChatMsg[]>(initialMessages);
  const [source, setSource] = useState<"brand" | "kalorip">(initialSource);
  const [projectId, setProjectId] = useState(initialProject);
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages, pending]);

  function send(textIn?: string) {
    const text = (textIn ?? draft).trim();
    if (!text || pending) return;
    setError("");
    const fd = new FormData();
    fd.set("text", text);
    fd.set("source", source);
    fd.set("projectId", source === "brand" ? projectId : "");
    if (threadId) fd.set("threadId", threadId);
    if (image) fd.set("image", image);
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text, hasImage: !!image }]);
    setDraft("");
    const hadImage = image;
    setImage(null);
    if (fileRef.current) fileRef.current.value = "";
    start(async () => {
      const r = await sendMentorAction(fd);
      if (!r.ok) {
        setError(r.error);
        setMessages((m) => m.slice(0, -1));
        setDraft(text);
        if (hadImage) setImage(hadImage);
        return;
      }
      setThreadId(r.threadId);
      window.history.replaceState(null, "", `/mentor?t=${r.threadId}`);
      setMessages((m) => [...m, { id: r.assistant.id, role: "assistant", text: r.assistant.text, basis: r.assistant.basis, sources: r.assistant.sources }]);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
      <Card className="p-3 lg:max-h-[calc(100dvh-14rem)] lg:overflow-y-auto">
        <Link href="/mentor" className="mb-2 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-accent transition hover:bg-surface-2">
          <Plus className="h-4 w-4" aria-hidden="true" /> New chat
        </Link>
        {threads.length === 0 ? (
          <p className="px-3 py-4 text-xs text-muted">Your chats are saved here.</p>
        ) : (
          <ul className="space-y-0.5">
            {threads.map((t) => (
              <li key={t.id} className="group flex items-center gap-1">
                <Link href={`/mentor?t=${t.id}`} className={`min-w-0 flex-1 truncate rounded-xl px-3 py-2.5 text-sm transition hover:bg-surface-2 ${t.id === threadId ? "bg-surface-2 font-medium" : "text-muted"}`}>
                  {t.title}
                </Link>
                <form action={deleteThreadAction} onSubmit={(e) => { if (!window.confirm("Delete this chat? This can't be undone.")) e.preventDefault(); }}>
                  <input type="hidden" name="threadId" value={t.id} />
                  <button type="submit" aria-label={`Delete chat ${t.title}`} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted opacity-70 transition hover:bg-danger/10 hover:text-danger">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex min-h-[28rem] flex-col lg:h-[calc(100dvh-14rem)]">
        <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-md pt-6 text-center">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Sparkles className="h-6 w-6" aria-hidden="true" /></span>
              <h2 className="text-[17px] font-semibold tracking-tight">Ask your mentor anything</h2>
              <p className="mt-1 text-sm text-muted">Pick Brand or Kalorip below. Ask what to do next, have your ad reviewed, or attach a screenshot of your numbers and ask whether to scale.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s) => (
                  <button key={s} type="button" onClick={() => setDraft(s)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition hover:border-accent hover:text-fg">{s}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "user" ? "bg-accent text-white" : "bg-surface-2"}`}>
                  {m.hasImage && <p className="mb-1 flex items-center gap-1.5 text-xs opacity-80"><Paperclip className="h-3 w-3" aria-hidden="true" /> Screenshot attached</p>}
                  {m.role === "assistant" ? <Markdown text={m.text} /> : <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                  {m.role === "assistant" && (
                    <div className="mt-2 space-y-2 border-t border-border pt-2">
                      {m.basis && <p className="flex items-center gap-1.5 text-xs text-muted"><BookOpen className="h-3 w-3" aria-hidden="true" /> {BASIS_LABEL[m.basis]}</p>}
                      {isAdmin && m.sources && m.sources.length > 0 && <p className="break-words text-xs text-muted">Admin only, used: {m.sources.join("; ")}</p>}
                      {!m.id.startsWith("u-") && <FeedbackButtons kind="chat" targetId={m.id} initial={m.rating ?? 0} />}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {pending && <div className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Thinking…</div>}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-3">
          {error && <p role="alert" className="mb-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          {image && (
            <p className="mb-2 flex items-center gap-2 text-xs text-muted">
              <Paperclip className="h-3 w-3" aria-hidden="true" /> {image.name}
              <button type="button" aria-label="Remove screenshot" onClick={() => { setImage(null); if (fileRef.current) fileRef.current.value = ""; }}><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
            </p>
          )}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <label htmlFor="mentor-source" className="sr-only">Knowledge base</label>
            <select id="mentor-source" value={source} onChange={(e) => setSource(e.target.value === "kalorip" ? "kalorip" : "brand")} className="h-10 rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent">
              <option value="brand">Brand</option>
              <option value="kalorip">Kalorip</option>
            </select>
            {source === "brand" && (
              <>
                <label htmlFor="mentor-project" className="sr-only">Project</label>
                <select id="mentor-project" value={projectId} onChange={(e) => setProjectId(e.target.value)} className="h-10 min-w-0 max-w-[14rem] rounded-xl border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent">
                  <option value="">Don&apos;t use a project</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2">
            <input ref={fileRef} id="mentor-image" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach a screenshot" onClick={() => fileRef.current?.click()}><Paperclip className="h-5 w-5" /></Button>
            <textarea
              id="mentor-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              maxLength={2000}
              placeholder={source === "kalorip" ? "Ask about Kalorip…" : "Ask your mentor…"}
              aria-label="Your message"
              className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-4 py-2.5 text-[15px] outline-none focus:border-accent"
            />
            <Button type="submit" size="icon-sm" disabled={pending || !draft.trim()} aria-label="Send">{pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" />}</Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
