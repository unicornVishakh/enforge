import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExperimentsClient } from "./experiments-client";
import type { Project } from "@/lib/types/database";

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
  return { title: `Experiments · ${data?.name ?? "Project"}` };
}

interface CandidateRow {
  id: string;
  name: string;
  organism: string | null;
  ec_number: string | null;
}

interface ExperimentWithRefs {
  id: string;
  candidate_id: string;
  performed_at: string;
  measured_activity: number | null;
  measured_stability: number | null;
  measured_yield: number | null;
  notes: string | null;
  candidate_name?: string;
  predicted_activity?: number;
  predicted_stability?: number;
  predicted_yield?: number;
  model_version?: string;
}

export default async function ExperimentsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: candidates }, { data: experiments }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("enzyme_candidates")
        .select("id, name, organism, ec_number")
        .eq("project_id", id),
      supabase
        .from("experiments")
        .select(
          `id, candidate_id, performed_at, measured_activity, measured_stability, measured_yield, notes,
           enzyme_candidates ( name, project_id ),
           predictions ( activity_score, stability_score, predicted_yield, model_version )`,
        )
        .order("performed_at", { ascending: false }),
    ]);
  if (!project) notFound();
  const p = project as Project;
  const cands = (candidates ?? []) as CandidateRow[];

  type ExperimentRow = {
    id: string;
    candidate_id: string;
    performed_at: string;
    measured_activity: number | null;
    measured_stability: number | null;
    measured_yield: number | null;
    notes: string | null;
    enzyme_candidates: { name: string; project_id: string } | null;
    predictions: {
      activity_score: number;
      stability_score: number;
      predicted_yield: number;
      model_version: string;
    } | null;
  };

  const list: ExperimentWithRefs[] = ((experiments ?? []) as unknown as ExperimentRow[])
    .filter((e) => e.enzyme_candidates?.project_id === id)
    .map((e) => ({
      id: e.id,
      candidate_id: e.candidate_id,
      performed_at: e.performed_at,
      measured_activity: e.measured_activity,
      measured_stability: e.measured_stability,
      measured_yield: e.measured_yield,
      notes: e.notes,
      candidate_name: e.enzyme_candidates?.name,
      predicted_activity: e.predictions?.activity_score,
      predicted_stability: e.predictions?.stability_score,
      predicted_yield: e.predictions?.predicted_yield,
      model_version: e.predictions?.model_version,
    }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Experiments
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-muted-foreground text-sm">
          Log measured outcomes against your candidates. The feedback loop
          calibrates predictions on the next retrain.
        </p>
      </header>

      <ExperimentsClient candidates={cands} initial={list} />
    </div>
  );
}
