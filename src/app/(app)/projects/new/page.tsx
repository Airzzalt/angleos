import { FileArchive, Upload } from "lucide-react";
import { PageHeader } from "@/components/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";

export const metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" description="Tell AngleOS about the product, then upload your research." />
      <div className="grid grid-cols-1 max-w-4xl gap-6 lg:grid-cols-5">
        <Card className="space-y-4 p-6 lg:col-span-3">
          <div>
            <Label htmlFor="name">Product name</Label>
            <Input id="name" placeholder="e.g. Aurora Sleep Mask" />
          </div>
          <div>
            <Label htmlFor="url">Product URL</Label>
            <Input id="url" type="url" placeholder="https://" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="niche">Niche</Label>
              <Input id="niche" placeholder="e.g. Sleep and wellness" />
            </div>
            <div>
              <Label htmlFor="market">Market</Label>
              <Select id="market" defaultValue="AU">
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
                <option value="US">United States</option>
                <option value="UK">United Kingdom</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="desc">Short description</Label>
            <Textarea id="desc" placeholder="What it is, who it's for, and what makes it different." />
          </div>
        </Card>

        <Card className="flex flex-col p-6 lg:col-span-2">
          <p className="mb-1.5 text-[13px] font-medium text-muted">Research files</p>
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong px-4 py-10 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2 text-muted">
              <FileArchive className="h-6 w-6" />
            </span>
            <p className="font-medium">Drop a .zip here</p>
            <p className="mt-1 text-sm text-muted">Or PDF, DOCX, TXT, MD, CSV files</p>
            <Button variant="secondary" size="sm" className="mt-4">
              <Upload className="h-4 w-4" /> Choose files
            </Button>
          </div>
        </Card>
      </div>
      <div className="mt-6 flex max-w-4xl items-center justify-between gap-4">
        <p className="text-sm text-muted">Creating projects is switched on in Phase 2.</p>
        <Button disabled>Create project</Button>
      </div>
    </>
  );
}
