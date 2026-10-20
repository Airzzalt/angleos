import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { sampleProjects } from "@/lib/placeholder";
import { PageHeader } from "@/components/page";
import { ProjectTabs } from "@/components/project-tabs";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = sampleProjects.find((p) => p.id === id);
  if (!project) notFound();
  return (
    <>
      <Link href="/projects" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> All projects
      </Link>
      <PageHeader title={project.name} description={`${project.niche} · ${project.market}`} />
      <ProjectTabs score={project.score} />
    </>
  );
}
