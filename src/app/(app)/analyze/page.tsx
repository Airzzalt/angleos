import { PageHeader } from "@/components/page";
import { AnalyzeAd } from "@/components/analyze-ad";

export const metadata = { title: "Analyze Ad" };

export default function AnalyzePage() {
  return (
    <>
      <PageHeader title="Analyze Ad" description="See step by step why an ad works, with the playbook rule behind each point." />
      <AnalyzeAd />
    </>
  );
}
