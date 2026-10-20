import { Skeleton } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/page";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8">
        <CardGridSkeleton />
      </div>
    </div>
  );
}
