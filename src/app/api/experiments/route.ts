import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

export const runtime = "nodejs";

const Body = z.object({
  candidate_id: z.uuid(),
  measured_activity: z.coerce.number().min(0).max(1).optional().nullable(),
  measured_stability: z.coerce.number().min(0).max(1).optional().nullable(),
  measured_yield: z.coerce.number().min(0).max(1).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number().optional(),
      }),
    )
    .optional(),
});

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

  const { data: candidate } = await supabase
    .from("enzyme_candidates")
    .select("id, project_id")
    .eq("id", body.candidate_id)
    .maybeSingle();
  if (!candidate) {
    return NextResponse.json({ ok: false, error: "Candidate not found" }, { status: 404 });
  }

  // Snapshot the latest prediction so the experiment is bound to a specific
  // model_version (audit trail; survives later retrains).
  const { data: latestPrediction } = await supabase
    .from("predictions")
    .select("id")
    .eq("candidate_id", body.candidate_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: experiment, error } = await supabase
    .from("experiments")
    .insert({
      candidate_id: body.candidate_id,
      performed_by: user.id,
      measured_activity: body.measured_activity ?? null,
      measured_stability: body.measured_stability ?? null,
      measured_yield: body.measured_yield ?? null,
      notes: body.notes ?? null,
      attachments: (body.attachments ?? []) as unknown as Json,
      prediction_id: latestPrediction?.id ?? null,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  // Audit
  const { data: project } = await supabase
    .from("projects")
    .select("workspace_id")
    .eq("id", candidate.project_id)
    .maybeSingle();
  if (project) {
    await supabase.from("audit_log").insert({
      user_id: user.id,
      workspace_id: project.workspace_id,
      action: "experiment.logged",
      entity_type: "candidate",
      entity_id: body.candidate_id,
      payload: {
        experiment_id: experiment.id,
        measured: {
          activity: body.measured_activity,
          stability: body.measured_stability,
          yield: body.measured_yield,
        },
      },
    });
  }

  return NextResponse.json({ ok: true, experiment });
}
