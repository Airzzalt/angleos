import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export const metadata = { title: "Feedback" };

type Row = {
  id: string; kind: string; rating: number; note: string; created_at: string; email: string;
  answer: string | null; script_title: string | null; script_text: string | null; question: string | null; angle: { angle?: string } | null; project_name: string | null;
};

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const showAll = sp.show === "all";
  const { rows } = await query<Row>(
    `select f.id, f.kind, f.rating, f.note, f.created_at, u.email,
            m.content as answer,
            (select q.content from chat_messages q where q.thread_id = m.thread_id and q.role = 'user' and q.created_at < m.created_at order by q.created_at desc limit 1) as question,
            a.data as angle, coalesce(p.name, sp.name) as project_name, s.title as script_title,
            (select string_agg(x->>'say', ' ') from script_versions v, jsonb_array_elements(v.data->'scenes') x where v.script_id = s.id and v.version_no = s.current_version) as script_text
       from feedback f join users u on u.id = f.owner_id
       left join chat_messages m on f.kind = 'chat' and m.id = f.target_id
       left join project_angles a on f.kind = 'angle' and a.id = f.target_id
       left join projects p on p.id = a.project_id
       left join scripts s on f.kind = 'script' and s.id = f.target_id
       left join projects sp on sp.id = s.project_id
      ${showAll ? "" : "where f.rating = -1"}
      order by f.updated_at desc limit 100`,
  );
  const counts = (await query<{ up: string; down: string }>("select count(*) filter (where rating = 1) as up, count(*) filter (where rating = -1) as down from feedback")).rows[0];
  return (
    <>
      <PageHeader preview={false} title="Feedback" description="Thumbs up and down from chat answers and angles. Thumbs downs show where the knowledge base or the prompts fall short." />
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        <Badge tone="neutral">{counts?.up ?? 0} thumbs up</Badge>
        <Badge tone="warning">{counts?.down ?? 0} thumbs down</Badge>
        <a href={showAll ? "/admin/feedback" : "/admin/feedback?show=all"} className="text-accent underline-offset-4 hover:underline">{showAll ? "Show only thumbs down" : "Show everything"}</a>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ThumbsDown} title="No feedback yet" description="When people press thumbs up or down on an answer or an angle, it shows up here." />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2 p-5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {r.rating === 1 ? <ThumbsUp className="h-4 w-4 text-success" aria-label="Thumbs up" /> : <ThumbsDown className="h-4 w-4 text-danger" aria-label="Thumbs down" />}
                  <Badge tone="accent">{r.kind === "chat" ? "Chat answer" : r.kind === "script" ? "Script" : "Angle"}</Badge>
                  <span className="text-xs text-muted">{r.email} · {new Date(r.created_at).toLocaleString("en-AU", { timeZone: "Australia/Perth", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {r.note && <p className="break-words"><span className="font-medium">What was wrong:</span> {r.note}</p>}
                {r.kind === "chat" ? (
                  <>
                    {r.question && <p className="break-words text-muted"><span className="font-medium text-fg">They asked:</span> {r.question}</p>}
                    {r.answer && <p className="whitespace-pre-wrap break-words text-muted"><span className="font-medium text-fg">The answer:</span> {r.answer.slice(0, 900)}</p>}
                  </>
                ) : r.kind === "script" ? (
                  <>
                    <p className="break-words text-muted"><span className="font-medium text-fg">Script{r.project_name ? ` (${r.project_name})` : ""}:</span> {r.script_title ?? "(deleted)"}</p>
                    {r.script_text && <p className="whitespace-pre-wrap break-words text-muted">{r.script_text.slice(0, 900)}</p>}
                  </>
                ) : (
                  <p className="break-words text-muted"><span className="font-medium text-fg">Angle{r.project_name ? ` (${r.project_name})` : ""}:</span> {r.angle?.angle ?? "(deleted)"}</p>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
