import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  predictCandidate,
  MODEL_VERSION_BASE,
  type CalibrationParams,
} from "@/lib/scoring/predict";
import type { Json, Mutation, EnzymeCandidate } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  candidateIds: z.array(z.uuid()).min(1).max(50).optional(),
  projectId: z.uuid().optional(),
});

interface PredictionRowOut {
  candidate_id: string;
  model_version: string;
  activity_score: number;
  stability_score: number;
  expression_score: number;
  predicted_yield: number;
  confidence_lower: number;
  confidence_upper: number;
  features: Json;
}

function decodeEmbedding(raw: string | number[] | null | undefined): number[] | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  // pgvector returns "[0.1,0.2,…]" as string
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  // Resolve target candidates either by explicit IDs or by project.
  let candidatesQ = supabase.from("enzyme_candidates").select("*");
  if (body.candidateIds) {
    candidatesQ = candidatesQ.in("id", body.candidateIds);
  } else if (body.projectId) {
    candidatesQ = candidatesQ.eq("project_id", body.projectId);
  } else {
    return NextResponse.json(
      { ok: false, error: "Provide either candidateIds or projectId" },
      { status: 400 },
    );
  }

  const { data: candidates, error } = await candidatesQ;
  if (error || !candidates || candidates.length === 0) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "No candidates found" },
      { status: 404 },
    );
  }

  const projectId = body.projectId ?? candidates[0].project_id;
  // Pull the cached KEGG ECs for this project's last retrieval.
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id, substrate, product")
    .eq("id", projectId)
    .maybeSingle();
  const cacheKey = project
    ? `retrieve:${(project.substrate ?? "").toLowerCase()}::${(project.product ?? "").toLowerCase()}`
    : null;
  let projectECs: string[] = [];
  if (cacheKey) {
    const { data: cache } = await supabase
      .from("retrieval_cache")
      .select("payload")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (cache?.payload && typeof cache.payload === "object") {
      const p = cache.payload as { kegg?: { ec_numbers?: string[] } };
      projectECs = p.kegg?.ec_numbers ?? [];
    }
  }

  // Latest calibration (if any).
  const { data: latestCal } = await supabase
    .from("model_calibration")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const calibration = (latestCal?.calibration_params as CalibrationParams | null) ?? null;
  const modelVersion = latestCal?.model_version ?? MODEL_VERSION_BASE;

  // Build a quick lookup of parent embeddings so variants can use them.
  const parentEmbeddingByCandidate = new Map<string, number[] | null>();
  for (const c of candidates as EnzymeCandidate[]) {
    if (c.parent_id) {
      const parent = candidates.find((x) => x.id === c.parent_id);
      parentEmbeddingByCandidate.set(c.id, decodeEmbedding(parent?.embedding ?? null));
    }
  }

  // Score every candidate.
  const rows: PredictionRowOut[] = (candidates as EnzymeCandidate[]).map((c) => {
    const result = predictCandidate({
      sequence: c.sequence,
      embedding: decodeEmbedding(c.embedding),
      parent_embedding: parentEmbeddingByCandidate.get(c.id) ?? null,
      mutations: (c.mutations as unknown as Mutation[]) ?? [],
      project_ec_numbers: projectECs,
      ec_number: c.ec_number,
      calibration,
      similar_observations: latestCal?.n_observations ?? 0,
    });
    return {
      candidate_id: c.id,
      model_version: modelVersion,
      activity_score: result.activity_score,
      stability_score: result.stability_score,
      expression_score: result.expression_score,
      predicted_yield: result.predicted_yield,
      confidence_lower: result.confidence_lower,
      confidence_upper: result.confidence_upper,
      features: result.features as unknown as Json,
    };
  });

  // Persist predictions (one new row per candidate per run; old rows retained
  // as audit trail).
  const { error: insErr } = await supabase.from("predictions").insert(rows);
  if (insErr) {
    return NextResponse.json(
      { ok: false, error: `Persist failed: ${insErr.message}` },
      { status: 500 },
    );
  }

  // Audit
  if (project) {
    await supabase.from("audit_log").insert({
      user_id: user.id,
      workspace_id: project.workspace_id,
      action: "predict.run",
      entity_type: "project",
      entity_id: projectId,
      payload: {
        model_version: modelVersion,
        n: rows.length,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    model_version: modelVersion,
    n: rows.length,
    predictions: rows,
  });
}
