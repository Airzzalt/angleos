import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { EmptyState, PageHeader } from "@/components/page";
import { Badge, Card } from "@/components/ui/card";
import { ThumbsDown, ThumbsUp } from "lucide-react";

export const metadata = { title: "Feedback" };

type Row = {
  id: string; kind: string; rating: number; note: string; created_at: string; email: string;
  answer: string | null; question: string | null; angle: { angle?: string } | null; project_name: string | null;
};

export default async function FeedbackPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const showAll = sp.show === "all";
  const { rows } = await query<Row>(
    `select f.id, f.kind, f.rating, f.note, f.created_at, u.email,
            m.content as answer,
            (select q.content from chat_messages q where q.thread_id = m.thread_id and q.role = 'user' and q.created_at < m.created_at order by q.created_at desc limit 1) as question,
            a.data as angle, p.name as project_name
       from feedback f join users u on u.id = f.owner_id
       left join chat_messages m on f.kind = 'chat' and m.id = f.target_id
       left join project_angles a on f.kind = 'angle' and a.id = f.target_id
       left join projects p on p.id = a.project_id
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
                  <Badge tone="accent">{r.kind === "chat" ? "Chat answer" : "Angle"}</Badge>
                  <span className="text-xs text-muted">{r.email} · {new Date(r.created_at).toLocaleString("en-AU", { timeZone: "Australia/Perth", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {r.note && <p className="break-words"><span className="font-medium">What was wrong:</span> {r.note}</p>}
                {r.kind === "chat" ? (
                  <>
                    {r.question && <p className="break-words text-muted"><span className="font-medium text-fg">They asked:</span> {r.question}</p>}
                    {r.answer && <p className="whitespace-pre-wrap break-words text-muted"><span className="font-medium text-fg">The answer:</span> {r.answer.slice(0, 900)}</p>}
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
