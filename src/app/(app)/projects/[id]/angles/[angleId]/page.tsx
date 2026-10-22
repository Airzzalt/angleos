import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getProject } from "@/lib/projects";
import { getAngle } from "@/lib/ai/angles";
import { Badge, Card } from "@/components/ui/card";
import { AngleActionsBar } from "@/components/angle-actions-bar";

export const metadata = { title: "Angle" };

const isId = (s: string) => /^[0-9a-f-]{36}$/i.test(s);

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <div className="mt-2 space-y-2 text-sm text-muted">{children}</div>
    </Card>
  );
}

export default async function AngleDetailPage({ params }: { params: Promise<{ id: string; angleId: string }> }) {
  const me = await requireUser();
  const { id, angleId } = await params;
  if (!isId(id) || !isId(angleId)) notFound();
  const project = await getProject(me, id);
  if (!project) notFound();
  const row = await getAngle(project.id, angleId);
  if (!row) notFound();
  const d = row.data;
  const avoid = [...(d.avoid ?? []), ...d.risks];

  const copyText = [
    d.angle,
    d.sub_avatar && `Who: ${d.sub_avatar}`,
    d.ladder && `Surface: ${d.ladder.surface}\nEmotional: ${d.ladder.emotional}\nIdentity: ${d.ladder.identity}`,
    d.chain && `Why it matters: ${[d.chain.sign, d.chain.physical, d.chain.night, d.chain.next_day].filter(Boolean).join(" -> ")}`,
    d.inaction && `If they do nothing: ${d.inaction}`,
    d.result && `The result: ${d.result}`,
    d.mechanism && `Mechanism: ${d.mechanism}`,
    d.hooks.length && `Hooks:\n${d.hooks.map((h, i) => `${i + 1}. ${h}`).join("\n")}`,
    d.deep?.story && `The avatar:\n${d.deep.story}`,
    d.deep?.belief_steps.length && `Belief steps:\n${d.deep.belief_steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}`,
    d.deep?.belief_needed && `Needs to believe: ${d.deep.belief_needed}`,
    d.deep?.objections.length && `Objections:\n${d.deep.objections.map((o) => `- ${o.objection}: ${o.answer}`).join("\n")}`,
    d.deep && Object.values(d.deep.outline).some(Boolean) && `Ad outline:\nHook: ${d.deep.outline.hook}\nProblem: ${d.deep.outline.problem}\nWhy: ${d.deep.outline.why}\nProduct: ${d.deep.outline.product}\nResult: ${d.deep.outline.result}\nOffer: ${d.deep.outline.offer}`,
  ].filter(Boolean).join("\n\n");

  return (
    <>
      <Link href={`/projects/${project.id}?tab=angles`} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Back to the angles for {project.name}
      </Link>

      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            {d.awareness && <Badge tone="accent">{d.awareness}</Badge>}
            {row.edited && <Badge tone="neutral">edited by you</Badge>}
            {d.deep && <Badge tone="neutral">Full angle brief</Badge>}
          </div>
          {d.sub_avatar && <p className="mt-3 break-words text-sm text-muted"><span className="font-medium text-fg">Who:</span> {d.sub_avatar}</p>}
          <h1 className="mt-2 break-words text-[24px] font-semibold leading-snug tracking-tight">{d.angle}</h1>

          {d.ladder ? (
            <dl className="mt-4 space-y-2 text-sm">
              {([["Surface", d.ladder.surface], ["Emotional", d.ladder.emotional], ["Identity", d.ladder.identity]] as const).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex gap-3"><dt className="w-20 shrink-0 font-medium">{k}</dt><dd className="min-w-0 break-words text-muted">{v}</dd></div>
              ))}
            </dl>
          ) : (
            d.desire && <p className="mt-4 break-words text-sm text-muted"><span className="font-medium text-fg">Desire:</span> {d.desire}</p>
          )}

          <div className="mt-5 border-t border-border pt-4">
            <AngleActionsBar projectId={project.id} id={row.id} favourite={row.favourite} angle={d.angle} hooks={d.hooks} hasDeep={!!d.deep} copyText={copyText} />
          </div>
        </Card>

        {d.chain && (
          <Block title="Why it matters (the stakes)">
            <ol className="grid grid-cols-1 gap-2 sm:grid-cols-4">
              {([["They see", d.chain.sign], ["Physically", d.chain.physical], ["Their night", d.chain.night], ["Next day", d.chain.next_day]] as const).filter(([, v]) => v).map(([k, v], i, arr) => (
                <li key={k} className="relative rounded-xl bg-surface-2 px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-accent">{k}</p>
                  <p className="mt-1 break-words text-fg">{v}</p>
                  {i < arr.length - 1 && <ArrowRight className="absolute -right-2.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted sm:block" aria-hidden />}
                </li>
              ))}
            </ol>
          </Block>
        )}

        {(d.inaction || d.result) && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {d.inaction && <Block title="If they do nothing"><p className="break-words text-fg">{d.inaction}</p></Block>}
            {d.result && <Block title="The result they hope for"><p className="break-words text-fg">{d.result}</p></Block>}
          </div>
        )}

        {d.mechanism && <Block title="Mechanism"><p className="break-words text-fg">{d.mechanism}</p></Block>}

        {d.hooks.length > 0 && (
          <Block title={`Hooks (${d.hooks.length})`}>
            <ol className="space-y-1.5">
              {d.hooks.map((h, i) => (
                <li key={i} className="break-words rounded-xl bg-surface-2 px-3 py-2 text-fg">{h}</li>
              ))}
            </ol>
          </Block>
        )}

        {d.deep && (
          <Card className="space-y-5 p-5">
            <h2 className="text-base font-semibold tracking-tight">Full angle brief</h2>
            {d.deep.story && <div><h3 className="text-sm font-semibold">The avatar</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{d.deep.story}</p></div>}
            {(d.deep.belief_now || d.deep.belief_steps.length > 0 || d.deep.belief_needed) && (
              <div className="text-sm text-muted">
                <h3 className="font-semibold text-fg">Belief to move</h3>
                {d.deep.belief_now && <p className="mt-1 break-words"><span className="text-fg">Believes now:</span> {d.deep.belief_now}</p>}
                {d.deep.belief_steps.length > 0 && <ol className="my-2 list-decimal space-y-1 pl-5">{d.deep.belief_steps.map((x, i) => <li key={i} className="break-words">{x}</li>)}</ol>}
                {d.deep.belief_needed && <p className="break-words"><span className="text-fg">Needs to believe:</span> {d.deep.belief_needed}</p>}
              </div>
            )}
            {d.deep.objections.length > 0 && (
              <div className="text-sm text-muted">
                <h3 className="font-semibold text-fg">Top objections and answers</h3>
                <ul className="mt-2 space-y-3">{d.deep.objections.map((o, i) => <li key={i} className="break-words"><span className="font-medium text-fg">{o.objection}</span><br />{o.answer}</li>)}</ul>
              </div>
            )}
            {d.deep.proof_needed.length > 0 && (
              <div className="text-sm text-muted"><h3 className="font-semibold text-fg">Proof we would need</h3><ul className="mt-1 list-disc space-y-1 pl-5">{d.deep.proof_needed.map((x, i) => <li key={i} className="break-words">{x}</li>)}</ul></div>
            )}
            {Object.values(d.deep.outline).some(Boolean) && (
              <div className="text-sm text-muted">
                <h3 className="font-semibold text-fg">Ad outline</h3>
                <dl className="mt-2 space-y-2">
                  {([["Hook", d.deep.outline.hook], ["Problem", d.deep.outline.problem], ["Why", d.deep.outline.why], ["Product", d.deep.outline.product], ["Result", d.deep.outline.result], ["Offer", d.deep.outline.offer]] as const).filter(([, v]) => v).map(([k, v]) => (
                    <div key={k} className="flex gap-3"><dt className="w-16 shrink-0 font-medium text-fg">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>
                  ))}
                </dl>
              </div>
            )}
          </Card>
        )}

        <Block title="Why this angle and the proof">
          {d.why && <p className="break-words">{d.why}</p>}
          {d.evidence.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">{d.evidence.map((e, i) => <li key={i} className="break-words">{e}</li>)}</ul>
          )}
          {d.test_type && <p><span className="font-medium text-fg">How to test:</span> {d.test_type}</p>}
          {d.sources.length > 0 && <p className="break-words text-xs">From: {d.sources.join(", ")}</p>}
          {d.rules.length > 0 && <p className="break-words text-xs">Rules applied: {d.rules.join(", ")}</p>}
        </Block>

        {avoid.length > 0 && (
          <Card className="p-5">
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Claims to avoid ({avoid.length})</summary>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">{avoid.map((x, i) => <li key={i} className="break-words">{x}</li>)}</ul>
              <p className="mt-3 text-xs text-muted">Keep these out of ads and landing pages. They are kept apart on purpose so the selling parts stay positive.</p>
            </details>
          </Card>
        )}
        {d.market_note && (
          <Card className="p-5">
            <details>
              <summary className="cursor-pointer text-sm font-semibold">Market note</summary>
              <p className="mt-3 break-words text-sm text-muted">{d.market_note}</p>
            </details>
          </Card>
        )}
      </div>
    </>
  );
}
