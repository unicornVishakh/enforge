import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  EnzymeCandidate,
  Mutation,
  Project,
  Prediction,
} from "@/lib/types/database";

export const runtime = "nodejs";

/**
 * GET /api/export?projectId=...&format=fasta|json|csv[&candidateIds=a,b,c]
 *
 * Returns FASTA / JSON / CSV for the chosen candidates. Includes the latest
 * prediction per candidate when available.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get("projectId");
  const format = (url.searchParams.get("format") ?? "fasta").toLowerCase();
  const idsParam = url.searchParams.get("candidateIds");
  if (!projectId) {
    return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });
  }
  if (!["fasta", "json", "csv"].includes(format)) {
    return NextResponse.json({ ok: false, error: "format must be fasta|json|csv" }, { status: 400 });
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
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  let candQ = supabase
    .from("enzyme_candidates")
    .select("*")
    .eq("project_id", projectId);
  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) candQ = candQ.in("id", ids);
  }
  const { data: candidates } = await candQ;
  const cs = (candidates ?? []) as EnzymeCandidate[];

  // Latest prediction per candidate
  const { data: predictions } = await supabase
    .from("predictions")
    .select("*")
    .order("created_at", { ascending: false });
  const ps = (predictions ?? []) as Prediction[];
  const latestForCandidate = new Map<string, Prediction>();
  for (const p of ps) {
    if (!latestForCandidate.has(p.candidate_id)) latestForCandidate.set(p.candidate_id, p);
  }

  const filenameStem = (project as Project).name
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

  if (format === "fasta") {
    const lines: string[] = [];
    for (const c of cs) {
      const pred = latestForCandidate.get(c.id);
      const headerBits = [
        c.name,
        c.ec_number ? `EC=${c.ec_number}` : null,
        c.organism ? `OS=${c.organism.replace(/\s+/g, "_")}` : null,
        c.source ? `source=${c.source}` : null,
        pred ? `predicted_yield=${pred.predicted_yield.toFixed(3)}` : null,
        pred ? `model_version=${pred.model_version}` : null,
      ].filter(Boolean);
      lines.push(`>${headerBits.join("|")}`);
      // 60-column wrap
      for (let i = 0; i < c.sequence.length; i += 60) {
        lines.push(c.sequence.slice(i, i + 60));
      }
    }
    return new NextResponse(lines.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameStem}.fasta"`,
      },
    });
  }

  if (format === "csv") {
    const cols = [
      "id",
      "name",
      "source",
      "source_id",
      "ec_number",
      "organism",
      "length",
      "n_mutations",
      "activity_score",
      "stability_score",
      "expression_score",
      "predicted_yield",
      "confidence_lower",
      "confidence_upper",
      "model_version",
    ];
    const escape = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = [cols.join(",")];
    for (const c of cs) {
      const pred = latestForCandidate.get(c.id);
      const muts = (c.mutations as unknown as Mutation[]) ?? [];
      const cells: (string | number | null)[] = [
        c.id,
        c.name,
        c.source,
        c.source_id ?? "",
        c.ec_number ?? "",
        c.organism ?? "",
        c.sequence.length,
        muts.length,
        pred?.activity_score ?? "",
        pred?.stability_score ?? "",
        pred?.expression_score ?? "",
        pred?.predicted_yield ?? "",
        pred?.confidence_lower ?? "",
        pred?.confidence_upper ?? "",
        pred?.model_version ?? "",
      ];
      rows.push(cells.map((c) => (c == null ? "" : escape(String(c)))).join(","));
    }
    return new NextResponse(rows.join("\n") + "\n", {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameStem}.csv"`,
      },
    });
  }

  // JSON: full bundle including the experiment-plan template
  const bundle = {
    project: project,
    exported_at: new Date().toISOString(),
    candidates: cs.map((c) => {
      const pred = latestForCandidate.get(c.id);
      return {
        id: c.id,
        name: c.name,
        source: c.source,
        source_id: c.source_id,
        ec_number: c.ec_number,
        organism: c.organism,
        pdb_id: c.pdb_id,
        sequence: c.sequence,
        mutations: c.mutations,
        prediction: pred
          ? {
              model_version: pred.model_version,
              activity_score: pred.activity_score,
              stability_score: pred.stability_score,
              expression_score: pred.expression_score,
              predicted_yield: pred.predicted_yield,
              confidence_interval: [pred.confidence_lower, pred.confidence_upper],
            }
          : null,
      };
    }),
    suggested_experiment_plan: {
      replicates: 3,
      conditions: project.conditions,
      controls: ["wild-type parent (where applicable)", "no-enzyme negative"],
      reads: ["activity at endpoint", "thermostability via melt curve", "yield at 24h"],
    },
  };
  return new NextResponse(JSON.stringify(bundle, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filenameStem}.json"`,
    },
  });
}
