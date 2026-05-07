import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { buildPathwayGraph, type PathwayGraph } from "@/lib/scoring/pathway";
import { searchKEGGReactions } from "@/lib/external-apis/kegg";
import type { Json, Prediction, EnzymeCandidate } from "@/lib/types/database";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  projectId: z.uuid(),
  /** Optional override; defaults to project.substrate / product. */
  substrate: z.string().optional(),
  product: z.string().optional(),
  /** When true, persist the resulting graph to pathway_designs. */
  persist: z.boolean().optional(),
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

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", body.projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  const substrate = body.substrate ?? project.substrate ?? "";
  const product = body.product ?? project.product ?? "";
  if (!substrate || !product) {
    return NextResponse.json(
      { ok: false, error: "Project missing substrate or product" },
      { status: 400 },
    );
  }

  // Resolve compound IDs via KEGG (prefer-exact match logic lives in kegg.ts).
  const kegg = await searchKEGGReactions({ substrate, product, maxReactions: 1 });
  const subCpd = kegg.substrate_compound;
  const prodCpd = kegg.product_compound;

  if (!subCpd || !prodCpd) {
    return NextResponse.json(
      {
        ok: false,
        error: `Could not resolve KEGG compounds (substrate: ${subCpd?.cpd_id ?? "?"}, product: ${prodCpd?.cpd_id ?? "?"}).`,
      },
      { status: 422 },
    );
  }

  // Build the candidate→activity table for this project.
  const [{ data: candidates }, { data: predictions }] = await Promise.all([
    supabase
      .from("enzyme_candidates")
      .select("id, name, ec_number")
      .eq("project_id", body.projectId),
    supabase
      .from("predictions")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  const cs = (candidates ?? []) as Pick<EnzymeCandidate, "id" | "name" | "ec_number">[];
  const ps = (predictions ?? []) as Prediction[];
  const latestForCandidate = new Map<string, Prediction>();
  for (const p of ps) {
    if (!latestForCandidate.has(p.candidate_id)) latestForCandidate.set(p.candidate_id, p);
  }
  const candidateInfos = cs.map((c) => ({
    id: c.id,
    name: c.name,
    ec_number: c.ec_number,
    activity_score: latestForCandidate.get(c.id)?.activity_score ?? 0.4,
  }));

  const graph = await buildPathwayGraph({
    substrate_cpd_id: subCpd.cpd_id,
    product_cpd_id: prodCpd.cpd_id,
    candidates: candidateInfos,
    maxHops: 3,
  });

  // Replace the cpd_id labels with proper compound names where known.
  for (const node of graph.nodes) {
    if (node.cpd_id === subCpd.cpd_id) node.label = subCpd.primary_name;
    if (node.cpd_id === prodCpd.cpd_id) node.label = prodCpd.primary_name;
  }

  let pathwayId: string | null = null;
  if (body.persist) {
    const { data: inserted } = await supabase
      .from("pathway_designs")
      .insert({
        project_id: body.projectId,
        name: `${substrate} → ${product}`,
        graph: graph as unknown as Json,
        predicted_flux: graph.predicted_flux,
        bottlenecks: graph.bottleneck_edge_id
          ? ([
              { edge_id: graph.bottleneck_edge_id, explanation: graph.bottleneck_explanation },
            ] as unknown as Json)
          : ([] as unknown as Json),
      })
      .select("id")
      .single();
    pathwayId = inserted?.id ?? null;

    await supabase.from("audit_log").insert({
      user_id: user.id,
      workspace_id: project.workspace_id,
      action: "pathway.built",
      entity_type: "project",
      entity_id: body.projectId,
      payload: {
        n_edges: graph.edges.length,
        flux: graph.predicted_flux,
        bottleneck: graph.bottleneck_explanation,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    graph: graph as PathwayGraph,
    pathway_id: pathwayId,
    substrate_compound: subCpd,
    product_compound: prodCpd,
  });
}
