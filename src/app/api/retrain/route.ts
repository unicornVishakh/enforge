import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createUserClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";

export const runtime = "nodejs";

interface ObservationPair {
  predicted_activity: number;
  predicted_stability: number;
  predicted_yield: number;
  measured_activity: number | null;
  measured_stability: number | null;
  measured_yield: number | null;
  candidate_id: string;
  mutations: { position: number; from: string; to: string }[];
}

export async function POST() {
  // Require an authed user but use the admin client to write calibration
  // (insert respects model_calibration_authed_read RLS but writes are
  // service-role only).
  const userSupabase = await createUserClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Pull all experiments paired with the prediction they were measured against.
  const { data: experiments } = await supabase
    .from("experiments")
    .select(
      `id, candidate_id, measured_activity, measured_stability, measured_yield,
       prediction_id,
       predictions (
         activity_score, stability_score, predicted_yield
       ),
       enzyme_candidates ( mutations )`,
    );

  type Row = {
    candidate_id: string;
    measured_activity: number | null;
    measured_stability: number | null;
    measured_yield: number | null;
    predictions: {
      activity_score: number;
      stability_score: number;
      predicted_yield: number;
    } | null;
    enzyme_candidates: { mutations: unknown } | null;
  };

  const pairs: ObservationPair[] = [];
  for (const e of (experiments ?? []) as unknown as Row[]) {
    if (!e.predictions) continue;
    pairs.push({
      candidate_id: e.candidate_id,
      predicted_activity: e.predictions.activity_score,
      predicted_stability: e.predictions.stability_score,
      predicted_yield: e.predictions.predicted_yield,
      measured_activity: e.measured_activity,
      measured_stability: e.measured_stability,
      measured_yield: e.measured_yield,
      mutations: ((e.enzyme_candidates?.mutations as unknown) as ObservationPair["mutations"]) ?? [],
    });
  }

  if (pairs.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No experiment data to retrain on" },
      { status: 422 },
    );
  }

  const fitActivity = leastSquares(
    pairs.filter((p) => p.measured_activity !== null),
    "predicted_activity",
    "measured_activity",
  );
  const fitStability = leastSquares(
    pairs.filter((p) => p.measured_stability !== null),
    "predicted_stability",
    "measured_stability",
  );
  const fitYield = leastSquares(
    pairs.filter((p) => p.measured_yield !== null),
    "predicted_yield",
    "measured_yield",
  );

  const calibration = {
    activity: fitActivity?.params,
    stability: fitStability?.params,
    yield: fitYield?.params,
  };

  // ─── Hypothesis surfacing ────────────────────────────────────────────────
  // Underperformers: predicted - measured > 0.15 on yield. Find recurring
  // mutation positions among them.
  const underperformers = pairs.filter(
    (p) =>
      p.measured_yield !== null &&
      p.predicted_yield - (p.measured_yield ?? 0) > 0.15,
  );
  const positionCounts = new Map<number, number>();
  for (const u of underperformers) {
    for (const m of u.mutations) {
      positionCounts.set(m.position, (positionCounts.get(m.position) ?? 0) + 1);
    }
  }
  const hypotheses: Array<{ kind: string; detail: string; weight: number }> = [];
  for (const [pos, count] of positionCounts) {
    if (count >= 2) {
      hypotheses.push({
        kind: "recurring_mutation_in_underperformers",
        detail: `Position ${pos} mutated in ${count} of ${underperformers.length} underperforming variants — consider avoiding mutations here.`,
        weight: count / Math.max(1, underperformers.length),
      });
    }
  }
  hypotheses.sort((a, b) => b.weight - a.weight);

  // ─── Bump model version ──────────────────────────────────────────────────
  const { data: previous } = await supabase
    .from("model_calibration")
    .select("model_version")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextVersion = bumpVersion(previous?.model_version ?? "1.0.0");

  const { error: insErr } = await supabase.from("model_calibration").insert({
    model_version: nextVersion,
    n_observations: pairs.length,
    mae_activity: fitActivity?.mae ?? null,
    mae_stability: fitStability?.mae ?? null,
    mae_yield: fitYield?.mae ?? null,
    calibration_params: {
      ...calibration,
      hypotheses: hypotheses.slice(0, 8),
    } as unknown as Json,
  });

  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    model_version: nextVersion,
    n: pairs.length,
    mae: {
      activity: fitActivity?.mae ?? null,
      stability: fitStability?.mae ?? null,
      yield: fitYield?.mae ?? null,
    },
    calibration,
    hypotheses,
  });
}

function leastSquares<T extends ObservationPair>(
  rows: T[],
  xKey: keyof T,
  yKey: keyof T,
): { params: { slope: number; intercept: number }; mae: number } | null {
  if (rows.length < 2) return null;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (const r of rows) {
    const x = Number(r[xKey]);
    const y = Number(r[yKey]);
    sx += x;
    sy += y;
    sxy += x * y;
    sxx += x * x;
  }
  const n = rows.length;
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return { params: { slope: 1, intercept: 0 }, mae: averageMae(rows, xKey, yKey, 1, 0) };
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return {
    params: { slope, intercept },
    mae: averageMae(rows, xKey, yKey, slope, intercept),
  };
}

function averageMae<T extends ObservationPair>(
  rows: T[],
  xKey: keyof T,
  yKey: keyof T,
  slope: number,
  intercept: number,
): number {
  let acc = 0;
  for (const r of rows) {
    const x = Number(r[xKey]);
    const y = Number(r[yKey]);
    acc += Math.abs(slope * x + intercept - y);
  }
  return acc / rows.length;
}

function bumpVersion(v: string): string {
  const parts = v.split(".").map((p) => parseInt(p, 10));
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}
