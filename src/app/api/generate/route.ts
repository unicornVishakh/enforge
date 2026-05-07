import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateVariants } from "@/lib/scoring/variants";
import { HFUnavailableError } from "@/lib/huggingface";
import type { Json, Mutation } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  projectId: z.uuid(),
  parentCandidateIds: z.array(z.uuid()).min(1).max(5),
  nVariantsPerParent: z.number().int().min(1).max(8).optional(),
});

interface VariantSummary {
  id: string;
  name: string;
  parent_id: string;
  parent_name: string;
  mutations: Mutation[];
  proposal_score: number;
  length: number;
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: parents, error: parentErr } = await supabase
    .from("enzyme_candidates")
    .select("id, project_id, name, sequence")
    .in("id", body.parentCandidateIds);

  if (parentErr || !parents || parents.length === 0) {
    return NextResponse.json(
      { ok: false, error: parentErr?.message ?? "Parent candidates not found" },
      { status: 404 },
    );
  }

  const onlyOneProject = parents.every((p) => p.project_id === body.projectId);
  if (!onlyOneProject) {
    return NextResponse.json(
      { ok: false, error: "All parents must belong to the same project" },
      { status: 400 },
    );
  }

  // Fan out generation per parent. We run sequentially to avoid blasting
  // the HF rate limit; each call internally parallelizes its fillMask probes.
  const allVariants: VariantSummary[] = [];
  const errors: { parent_id: string; error: string }[] = [];

  for (const parent of parents) {
    try {
      const variants = await generateVariants({
        parentSequence: parent.sequence,
        parentName: parent.name.replace(/\s+/g, "_").slice(0, 40),
        nVariants: body.nVariantsPerParent ?? 8,
      });
      if (variants.length === 0) continue;

      const inserts = variants.map((v) => ({
        project_id: body.projectId,
        source: "generated" as const,
        source_id: null,
        name: v.name,
        sequence: v.sequence,
        parent_sequence: v.parent_sequence,
        parent_id: parent.id,
        mutations: v.mutations as unknown as Json,
        // pgvector accepts a JSON-array string ("[0.1,…]"); null means we
        // couldn't fetch an embedding (provider doesn't route ESM-2 →
        // feature-extraction).
        embedding: v.embedding ? (JSON.stringify(v.embedding) as unknown as string) : null,
        metadata: {
          generation_model: "facebook/esm2_t6_8M_UR50D",
          generation_method: "esm2_fillmask_mlm",
          proposal_score: v.proposal_score,
          length: v.sequence.length,
          generated_at: new Date().toISOString(),
        } as unknown as Json,
      }));

      const { data: inserted, error: insErr } = await supabase
        .from("enzyme_candidates")
        .insert(inserts)
        .select("id, name, parent_id, mutations");
      if (insErr) {
        errors.push({ parent_id: parent.id, error: insErr.message });
        continue;
      }
      for (let i = 0; i < (inserted ?? []).length; i++) {
        const row = inserted![i];
        const v = variants[i];
        allVariants.push({
          id: row.id,
          name: row.name,
          parent_id: parent.id,
          parent_name: parent.name,
          mutations: v.mutations,
          proposal_score: v.proposal_score,
          length: v.sequence.length,
        });
      }
    } catch (e) {
      const msg = e instanceof HFUnavailableError ? e.message : (e as Error).message;
      errors.push({ parent_id: parent.id, error: msg });
    }
  }

  // Audit
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", body.projectId)
    .maybeSingle();
  if (project) {
    await supabase.from("audit_log").insert({
      user_id: user.id,
      workspace_id: project.workspace_id,
      action: "generate.run",
      entity_type: "project",
      entity_id: body.projectId,
      payload: {
        n_parents: parents.length,
        n_variants_total: allVariants.length,
        errors,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    variants: allVariants,
    errors,
    n_total: allVariants.length,
  });
}
