"use client";

import { useState, useTransition } from "react";
import { Loader2, Network, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PathwayGraphView } from "@/components/visualizations/pathway-graph";
import type { PathwayGraph, PathwayEdge } from "@/lib/scoring/pathway";

interface Props {
  projectId: string;
  substrate: string;
  product: string;
  initial: PathwayGraph | null;
}

export function PathwayClient({ projectId, substrate, product, initial }: Props) {
  const [graph, setGraph] = useState<PathwayGraph | null>(initial);
  const [pending, startTransition] = useTransition();
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  function build() {
    startTransition(async () => {
      try {
        const res = await fetch("/api/pathway", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, persist: true }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { graph: PathwayGraph };
        setGraph(data.graph);
        toast.success(
          `Pathway built — ${data.graph.edges.length} reactions, flux ${data.graph.predicted_flux.toFixed(3)}`,
        );
      } catch (e) {
        toast.error(`Pathway build failed: ${(e as Error).message}`);
      }
    });
  }

  const selectedEdge: PathwayEdge | undefined = graph?.edges.find(
    (e) => e.id === selectedEdgeId,
  );
  const bottleneck: PathwayEdge | undefined = graph?.edges.find(
    (e) => e.is_bottleneck,
  );

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">KEGG-derived pathway</h2>
            <p className="text-muted-foreground text-xs">
              Shortest path through KEGG reactions; edges colored by best
              candidate activity. Click an edge to see suggested interventions.
            </p>
          </div>
          <Button size="sm" onClick={build} disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Building…
              </>
            ) : (
              <>
                <Network />
                {graph ? "Rebuild" : "Build pathway"}
              </>
            )}
          </Button>
        </header>

        {graph && graph.edges.length > 0 && (
          <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-[11px]">
            <span>
              <strong className="text-foreground font-mono">
                {graph.predicted_flux.toFixed(3)}
              </strong>{" "}
              predicted flux
            </span>
            <span>·</span>
            <span>
              <strong className="text-foreground font-mono">
                {graph.edges.length}
              </strong>{" "}
              reactions
            </span>
            <span>·</span>
            <span>
              <strong className="text-foreground font-mono">
                {graph.nodes.length}
              </strong>{" "}
              metabolites
            </span>
          </div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {graph && graph.edges.length > 0 ? (
          <PathwayGraphView
            graph={graph}
            onEdgeClick={(id) => setSelectedEdgeId(id)}
          />
        ) : (
          <Card className="flex h-[460px] items-center justify-center p-8">
            <div className="text-center">
              <Network className="text-muted-foreground mx-auto size-8" />
              <p className="text-muted-foreground mt-3 max-w-sm text-sm">
                No pathway yet. Click <strong>Build pathway</strong> to resolve
                KEGG compounds and trace the shortest reaction path between{" "}
                <span className="font-mono">{substrate}</span> and{" "}
                <span className="font-mono">{product}</span>.
              </p>
            </div>
          </Card>
        )}

        <aside className="space-y-3">
          {bottleneck && (
            <Card className="border-destructive/30 bg-destructive/5 space-y-2 p-4">
              <header className="flex items-center gap-2">
                <AlertTriangle className="text-destructive size-4" />
                <h4 className="text-sm font-semibold">Bottleneck</h4>
              </header>
              <p className="text-muted-foreground text-xs">
                {graph?.bottleneck_explanation}
              </p>
              {bottleneck.brenda_fallback && (
                <div className="mt-2 text-xs">
                  <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                    BRENDA reference
                  </p>
                  <p className="font-medium">{bottleneck.brenda_fallback.name}</p>
                  <p className="text-muted-foreground italic">
                    {bottleneck.brenda_fallback.organism}
                  </p>
                  <p className="text-muted-foreground mt-1 font-mono text-[10px]">
                    Km {bottleneck.brenda_fallback.km_mM ?? "—"} mM ·{" "}
                    kcat {bottleneck.brenda_fallback.kcat_s ?? "—"} s⁻¹
                  </p>
                </div>
              )}
            </Card>
          )}

          {selectedEdge && (
            <Card className="space-y-2 p-4">
              <header>
                <h4 className="text-sm font-semibold">Selected reaction</h4>
                <a
                  href={`https://www.kegg.jp/entry/${selectedEdge.reaction_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-mono text-[11px] hover:underline"
                >
                  {selectedEdge.reaction_id}
                </a>
              </header>
              {selectedEdge.ec_number && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  EC {selectedEdge.ec_number}
                </Badge>
              )}
              {selectedEdge.best_candidate_name ? (
                <p className="text-xs">
                  Best project candidate:{" "}
                  <span className="font-medium">
                    {selectedEdge.best_candidate_name}
                  </span>{" "}
                  <span className="text-muted-foreground font-mono">
                    (activity{" "}
                    {selectedEdge.best_candidate_activity?.toFixed(3) ?? "—"})
                  </span>
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">
                  No project candidate matches this EC. Consider generating
                  variants for an enzyme that catalyzes this step.
                </p>
              )}
            </Card>
          )}

          {graph && graph.edges.length > 0 && (
            <Card className="space-y-2 p-4">
              <h4 className="text-xs font-semibold tracking-wide uppercase">
                Suggested interventions
              </h4>
              <ul className="space-y-1.5 text-xs">
                {graph.edges
                  .filter((e) => (e.best_candidate_activity ?? 1) < 0.6)
                  .slice(0, 4)
                  .map((e) => (
                    <li key={e.id} className="text-muted-foreground">
                      <span className="text-foreground font-mono">
                        EC {e.ec_number ?? "?"}
                      </span>{" "}
                      —{" "}
                      {e.best_candidate_name
                        ? `replace ${e.best_candidate_name} (activity ${e.best_candidate_activity?.toFixed(2)}) with a generated variant.`
                        : "no project candidate; retrieve enzymes for this EC and run generation."}
                    </li>
                  ))}
                {graph.edges.every((e) => (e.best_candidate_activity ?? 0) >= 0.6) && (
                  <li className="text-muted-foreground">
                    All steps have activity ≥ 0.6 — solid candidate roster.
                  </li>
                )}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
