import { Ticket } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";
import { PageHeader, EmptyState } from "@/components/page";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { InviteForm } from "@/components/invite-form";
import { revokeInviteAction } from "./actions";

export const metadata = { title: "Invites" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  code_hint: string;
  role: string;
  note: string | null;
  locked_email: string | null;
  created_at: string;
  expires_at: string | null;
  used_at: string | null;
  revoked_at: string | null;
  used_by_name: string | null;
};

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Perth" });

function statusOf(r: Row) {
  if (r.used_at) return { label: `Used by ${r.used_by_name ?? "someone"}`, tone: "success" as const };
  if (r.revoked_at) return { label: "Revoked", tone: "danger" as const };
  if (r.expires_at && new Date(r.expires_at) < new Date()) return { label: "Expired", tone: "warning" as const };
  return { label: "Active", tone: "accent" as const };
}

export default async function InvitesPage() {
  await requireAdmin();
  const { rows } = await query<Row>(
    `select i.id, i.code_hint, i.role, i.note, i.locked_email, i.created_at, i.expires_at, i.used_at, i.revoked_at,
            u.name as used_by_name
       from invites i left join users u on u.id = i.used_by
      order by i.created_at desc limit 100`,
  );

  return (
    <>
      <PageHeader
        preview={false}
        title="Invites"
        description="Registration is invite only. Create a code, send it to the person, and they register with it. Each code works once."
      />
      <div className="space-y-6">
        <InviteForm />
        <Card>
          <CardHeader title="All invites" />
          {rows.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Ticket} title="No invites yet" description="Create your first code above." className="py-10" />
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border pb-1">
              {rows.map((r) => {
                const s = statusOf(r);
                const canRevoke = s.label === "Active";
                return (
                  <li key={r.id} className="flex min-h-[64px] flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {r.note || "No note"}{" "}
                        <span className="font-mono text-sm font-normal text-muted">ANGL-····-····-{r.code_hint}</span>
                      </span>
                      <span className="block text-sm text-muted">
                        Created {fmt(r.created_at)}
                        {r.expires_at ? ` · expires ${fmt(r.expires_at)}` : " · never expires"}
                        {r.locked_email ? ` · only for ${r.locked_email}` : ""}
                        {r.role === "admin" ? " · admin" : ""}
                      </span>
                    </span>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    {canRevoke && (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={r.id} />
                        <Button type="submit" variant="danger" size="sm">Revoke</Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
