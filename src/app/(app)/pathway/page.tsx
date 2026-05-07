import { Card } from "@/components/ui/card";

export const metadata = { title: "Pathway Designer · EnzymeForge.ai" };

export default function PathwayIndexPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Pathway designer
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Design metabolic pathways
        </h1>
        <p className="text-muted-foreground text-sm">
          Open a project to design a substrate→product pathway through KEGG
          reactions and your best candidate enzymes.
        </p>
      </header>

      <Card className="border-dashed p-12 text-center">
        <h2 className="text-lg font-semibold">Pick a project first</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Pathway design is scoped to a single substrate-product target. Open a
          project to access its pathway designer.
        </p>
      </Card>
    </div>
  );
}
