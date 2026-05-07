import { Card } from "@/components/ui/card";

export const metadata = { title: "New project · EnzymeForge.ai" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          New project
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Define your target reaction
        </h1>
        <p className="text-muted-foreground text-sm">
          Start by naming the project and noting the substrate, product, and
          conditions. The discovery workflow takes it from there.
        </p>
      </header>

      <Card className="p-6">
        <p className="text-muted-foreground text-sm">
          The project creation form is wired up in Phase 2 (data retrieval).
        </p>
      </Card>
    </div>
  );
}
