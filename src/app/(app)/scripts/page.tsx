import { PageHeader } from "@/components/page";
import { ScriptWriter } from "@/components/script-writer";

export const metadata = { title: "Script Writer" };

export default function ScriptsPage() {
  return (
    <>
      <PageHeader title="Script Writer" description="Pick formats, pick a project, and get scripts built from your course playbook." />
      <ScriptWriter />
    </>
  );
}
