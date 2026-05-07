import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DiscoveryWorkflow } from "./discovery-workflow";
import type {
  Project,
  EnzymeCandidate,
  Mutation,
  Prediction,
} from "@/lib/types/database";
import type {
  ParentCandidate,
  GeneratedVariant,
} from "@/components/discovery/generate-step";
import type {
  PredictableCandidate,
  PredictionRow,
} from "@/components/discovery/predict-step";

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
  const [{ data: project }, { data: candidates }, { data: predictions }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("enzyme_candidates")
        .select("*")
        .eq("project_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("predictions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
  if (!project) notFound();

  const p = project as Project;
  const initial = (candidates ?? []) as EnzymeCandidate[];
  const allPredictions = (predictions ?? []) as Prediction[];

  // For each candidate, keep only the latest prediction (predictions are
  // ordered by created_at desc; first occurrence is the latest).
  const seen = new Set<string>();
  const latestPredictions = allPredictions.filter((p) => {
    if (seen.has(p.candidate_id)) return false;
    seen.add(p.candidate_id);
    return true;
  });

  const dbCandidates = initial.filter((c) => c.source === "db");
  const generatedCandidates = initial.filter((c) => c.source === "generated");

  const initialCandidates = dbCandidates.map((c) => {
    const m = (c.metadata ?? {}) as {
      retrieval_source?: "uniprot" | "brenda";
      function?: string;
      length?: number;
    };
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

  const parents: ParentCandidate[] = dbCandidates.map((c) => ({
    id: c.id,
    name: c.name,
    organism: c.organism,
    ec_number: c.ec_number,
    sequence: c.sequence,
    length: c.sequence.length,
    source_id: c.source_id,
  }));

  const initialVariants: GeneratedVariant[] = generatedCandidates.map((c) => {
    const parent = dbCandidates.find((d) => d.id === c.parent_id);
    const m = (c.metadata ?? {}) as {
      proposal_score?: number;
      length?: number;
    };
    return {
      id: c.id,
      name: c.name,
      parent_id: c.parent_id ?? "",
      parent_name: parent?.name,
      parent_sequence: c.parent_sequence ?? parent?.sequence ?? undefined,
      sequence: c.sequence,
      mutations: (c.mutations as unknown as Mutation[]) ?? [],
      proposal_score: m.proposal_score ?? 0,
      length: m.length ?? c.sequence.length,
    };
  });

  const predictables: PredictableCandidate[] = initial.map((c) => {
    const parent = dbCandidates.find((d) => d.id === c.parent_id);
    return {
      id: c.id,
      name: c.name,
      source: c.source as "db" | "generated",
      organism: c.organism,
      ec_number: c.ec_number,
      parent_name: parent?.name ?? null,
      source_id: c.source_id,
    };
  });

  const initialPredictions: PredictionRow[] = latestPredictions.map((p) => ({
    candidate_id: p.candidate_id,
    model_version: p.model_version,
    activity_score: p.activity_score,
    stability_score: p.stability_score,
    expression_score: p.expression_score,
    predicted_yield: p.predicted_yield,
    confidence_lower: p.confidence_lower,
    confidence_upper: p.confidence_upper,
  }));

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
        initialCandidates={initialCandidates}
        parents={parents}
        initialVariants={initialVariants}
        predictables={predictables}
        initialPredictions={initialPredictions}
      />
    </div>
  );
}
