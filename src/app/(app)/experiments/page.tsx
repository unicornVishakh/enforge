import { Card } from "@/components/ui/card";

export const metadata = { title: "Experiments · EnzymeForge.ai" };

export default function ExperimentsPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Experiments
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          All experiments
        </h1>
        <p className="text-muted-foreground text-sm">
          Logged experimental outcomes across every project in this workspace.
        </p>
      </header>

      <Card className="border-dashed p-12 text-center">
        <h2 className="text-lg font-semibold">No experiments logged yet</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
          Once you log experimental outcomes against your candidates, they show
          up here and feed back into the model calibration loop.
        </p>
      </Card>
    </div>
  );
}
