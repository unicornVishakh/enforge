import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoveryWorkflow } from "./discovery-workflow";
import type {
  Project,
  EnzymeCandidate,
  Json,
} from "@/lib/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: `Discover · ${data?.name ?? "Project"}` };
}

export default async function DiscoverPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: candidates }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("enzyme_candidates")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!project) notFound();

  const p = project as Project;
  const initial = (candidates ?? []) as EnzymeCandidate[];

  // Convert DB rows into the same shape /api/retrieve returns so the client
  // component can render the table immediately on load.
  const initialCandidates = initial
    .filter((c) => c.source === "db")
    .map((c) => {
      const m = (c.metadata ?? {}) as { retrieval_source?: "uniprot" | "brenda"; function?: string; length?: number };
      return {
        id: c.id,
        source: m.retrieval_source ?? "uniprot",
        source_id: c.source_id ?? c.id,
        name: c.name,
        organism: c.organism ?? "Unknown",
        ec_number: c.ec_number,
        sequence: c.sequence,
        length: m.length ?? c.sequence.length,
        pdb_id: c.pdb_id,
        function: m.function ?? null,
        metadata: (c.metadata as unknown as Record<string, unknown>) ?? {},
      };
    });

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Discovery workflow
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-muted-foreground text-sm">
          {p.target_reaction || `${p.substrate} → ${p.product}`}
        </p>
      </header>

      <DiscoveryWorkflow
        projectId={p.id}
        substrate={p.substrate ?? ""}
        product={p.product ?? ""}
        initialCandidates={initialCandidates as unknown as Json}
        hasGenerated={initial.some((c) => c.source === "generated")}
        hasPredictions={false}
      />
    </div>
  );
}
