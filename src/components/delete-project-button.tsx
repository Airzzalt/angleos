"use client";
import { Trash2 } from "lucide-react";
import { deleteProjectAction } from "@/app/(app)/projects/actions";

/** Small delete button for project lists. Asks first, then removes the project, its files and its angles. */
export function DeleteProjectButton({ projectId, name, next = "/projects", className = "" }: { projectId: string; name: string; next?: "/projects" | "/angles"; className?: string }) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(e) => { if (!window.confirm(`Delete "${name}"? This removes its files, context and angles and can't be undone.`)) e.preventDefault(); }}
      className={className}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="next" value={next} />
      <button type="submit" aria-label={`Delete ${name}`} title="Delete" className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition hover:bg-danger/10 hover:text-danger">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
