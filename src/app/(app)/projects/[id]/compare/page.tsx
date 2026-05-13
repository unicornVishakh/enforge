import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CandidateCompare,
  type CompareCandidate,
} from "@/components/discovery/candidate-compare";
import type {
  EnzymeCandidate,
  Mutation,
  Prediction,
  Project,
} from "@/lib/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ids?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: `Compare · ${data?.name ?? "Project"}` };
}

const MAX_COMPARE = 5;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComparePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const sp = await searchParams;

  // Parse + filter UUIDs (silently drop anything that isn't a real UUID;
  // the database query would reject malformed ones and we want to fail open).
  const rawIds = (sp.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const wellFormedIds = rawIds.filter((s) => UUID_RE.test(s));
  // Cap at MAX_COMPARE with a server-side warning. Spec: take the first N.
  const requestedIds = wellFormedIds.slice(0, MAX_COMPARE);
  if (wellFormedIds.length > MAX_COMPARE) {
    console.warn(
      `[compare] capping ${wellFormedIds.length} requested ids to ${MAX_COMPARE}`,
    );
  }

  // <2 ids → redirect to discover with a toast flag.
  if (requestedIds.length < 2) {
    redirect(`/projects/${id}/discover?compare_error=too_few`);
  }

  const supabase = await createClient();

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!project) notFound();

  // Defense in depth: filter to candidates belonging to this project. RLS
  // already prevents cross-workspace access; this also enforces same-project.
  const { data: candidates } = await supabase
    .from("enzyme_candidates")
    .select("*")
    .in("id", requestedIds)
    .eq("project_id", id);
  const cs = (candidates ?? []) as EnzymeCandidate[];

  // All ids invalid → empty state.
  if (cs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
        <Link
          href={`/projects/${id}/discover`}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          ← Back to ranked list
        </Link>
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No candidates found</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            None of the requested candidates belong to this project, or they
            were deleted. Open the discovery workflow to pick from the current
            ranked list.
          </p>
          <Link
            href={`/projects/${id}/discover`}
            className={cn(buttonVariants({ size: "sm" }), "mt-6")}
          >
            Open ranked list
          </Link>
        </Card>
      </div>
    );
  }

  // Latest prediction per candidate.
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .in(
      "candidate_id",
      cs.map((c) => c.id),
    )
    .order("created_at", { ascending: false });
  const ps = (predictions ?? []) as Prediction[];
  const latestByCandidate = new Map<string, Prediction>();
  for (const p of ps) {
    if (!latestByCandidate.has(p.candidate_id)) {
      latestByCandidate.set(p.candidate_id, p);
    }
  }

  // Parent-name lookup for variants.
  const parentIds = Array.from(
    new Set(cs.map((c) => c.parent_id).filter((x): x is string => !!x)),
  );
  const parentNameById = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data: parents } = await supabase
      .from("enzyme_candidates")
      .select("id, name")
      .in("id", parentIds);
    for (const p of parents ?? []) parentNameById.set(p.id, p.name);
  }

  // Preserve the input order so the columns match what the user selected.
  const orderedCandidates = requestedIds
    .map((id) => cs.find((c) => c.id === id))
    .filter((c): c is EnzymeCandidate => !!c);

  const compareCandidates: CompareCandidate[] = orderedCandidates.map((c) => {
    const pred = latestByCandidate.get(c.id);
    return {
      id: c.id,
      name: c.name,
      source: c.source as "db" | "generated",
      ec_number: c.ec_number,
      organism: c.organism,
      source_id: c.source_id,
      parent_id: c.parent_id,
      parent_name: c.parent_id ? parentNameById.get(c.parent_id) ?? null : null,
      sequence: c.sequence,
      mutations: (c.mutations as unknown as Mutation[]) ?? [],
      prediction: pred
        ? {
            model_version: pred.model_version,
            activity_score: pred.activity_score,
            stability_score: pred.stability_score,
            expression_score: pred.expression_score,
            predicted_yield: pred.predicted_yield,
            confidence_lower: pred.confidence_lower,
            confidence_upper: pred.confidence_upper,
          }
        : null,
    };
  });

  const missing = requestedIds.length - compareCandidates.length;
  const notice =
    missing > 0
      ? `${missing} candidate${missing === 1 ? "" : "s"} could not be loaded ` +
        `(deleted, or doesn't belong to project ${(project as Project).name}).`
      : undefined;

  return (
    <CandidateCompare
      projectId={id}
      candidates={compareCandidates}
      notice={notice}
    />
  );
}
