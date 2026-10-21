import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/page";
import { Card } from "@/components/ui/card";
import { NewProjectForm } from "@/components/project-forms";

export const metadata = { title: "New project" };

export default async function NewProjectPage() {
  await requireUser();
  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>
      <PageHeader preview={false} title="New project" description="Tell AngleOS about the product, then upload your research." />
      <Card className="max-w-3xl p-6">
        <NewProjectForm />
      </Card>
    </>
  );
}
