import { PageHeader } from "@/components/page";
import { StaticBuilder } from "@/components/static-builder";

export const metadata = { title: "Static Ad Builder" };

export default function StaticPage() {
  return (
    <>
      <PageHeader
        title="Static Ad Builder"
        description="Nine headlines for your avatar, pick the best, then get a complete concept ready for a designer."
      />
      <StaticBuilder />
    </>
  );
}
