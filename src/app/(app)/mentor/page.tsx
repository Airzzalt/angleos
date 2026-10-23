import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader } from "@/components/page";
import { MentorChat, type ChatMsg } from "@/components/mentor-chat";

export const metadata = { title: "Mentor" };

export default async function MentorPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const me = await requireUser();
  const sp = await searchParams;
  const threads = (await query<{ id: string; title: string; source: string }>("select id, title, source from chat_threads where owner_id = $1 and source <> 'ask' order by updated_at desc limit 50", [me.id])).rows;
  const wanted = sp.t && /^[0-9a-f-]{36}$/i.test(sp.t) ? sp.t : null;
  const current = wanted ? (await query<{ id: string; source: string; project_id: string | null }>("select id, source, project_id from chat_threads where id = $1 and owner_id = $2 and source <> 'ask'", [wanted, me.id])).rows[0] : null;
  const messages: ChatMsg[] = current
    ? (
        await query<{ id: string; role: "user" | "assistant"; content: string; basis: string; sources: string[]; has_image: boolean; rating: number | null }>(
          `select m.id, m.role, m.content, m.basis, m.sources, m.has_image, f.rating
             from chat_messages m left join feedback f on f.kind = 'chat' and f.target_id = m.id and f.owner_id = m.owner_id
            where m.thread_id = $1 and m.owner_id = $2 order by m.created_at`,
          [current.id, me.id],
        )
      ).rows.map((r) => ({ id: r.id, role: r.role, text: r.content, basis: r.basis === "kb" ? "kb" : r.basis === "general" ? "general" : "", sources: me.role === "admin" ? r.sources : [], hasImage: r.has_image, rating: r.rating ?? 0 }))
    : [];
  const projects = (await query<{ id: string; name: string }>("select id, name from projects where owner_id = $1 or ($2::uuid is not null and workspace_id = $2::uuid) order by updated_at desc limit 50", [me.id, me.workspaceId])).rows;
  return (
    <>
      <PageHeader preview={false} title="Mentor" description="Ask anything about building and scaling your brand. Answers come from our built-in knowledge base first, then general AI knowledge. Every answer says which." />
      <MentorChat
        key={current?.id ?? "new"}
        threads={threads}
        threadId={current?.id ?? null}
        initialMessages={messages}
        initialSource={current?.source === "kalorip" ? "kalorip" : "brand"}
        initialProject={current?.project_id ?? ""}
        projects={projects}
        isAdmin={me.role === "admin"}
      />
    </>
  );
}
