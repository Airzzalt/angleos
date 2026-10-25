"use client";
import { useState, useTransition } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { setFeedbackAction } from "@/app/(app)/mentor/actions";

/** Thumbs up / down. A thumbs down asks "What was wrong?" so the owner can see where the answers fall short. */
export function FeedbackButtons({ kind, targetId, initial = 0 }: { kind: "chat" | "angle" | "script"; targetId: string; initial?: number }) {
  const [rating, setRating] = useState(initial);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  function save(r: 1 | -1, n: string) {
    start(async () => {
      const res = await setFeedbackAction(kind, targetId, r, n);
      if (res.ok) { setRating(r); setAsking(false); setMsg(r === 1 ? "Thanks" : "Thanks, noted"); }
      else setMsg(res.error ?? "Could not save.");
    });
  }
  const btn = "inline-flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-surface-2 disabled:opacity-50";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        <button type="button" disabled={pending} aria-label="Good answer" aria-pressed={rating === 1} onClick={() => save(1, "")} className={`${btn} ${rating === 1 ? "text-success" : "text-muted"}`}>
          <ThumbsUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" disabled={pending} aria-label="Bad answer" aria-pressed={rating === -1} onClick={() => { setAsking(true); setMsg(""); }} className={`${btn} ${rating === -1 ? "text-danger" : "text-muted"}`}>
          <ThumbsDown className="h-4 w-4" aria-hidden="true" />
        </button>
        {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
      </div>
      {asking && (
        <div className="space-y-2">
          <label htmlFor={`fb-${targetId}`} className="text-xs font-medium">What was wrong? (optional)</label>
          <textarea id={`fb-${targetId}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={600} className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent" />
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => save(-1, note)} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Send</button>
            <button type="button" onClick={() => setAsking(false)} className="rounded-lg px-3 py-1.5 text-xs text-muted hover:bg-surface-2">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
