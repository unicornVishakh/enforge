#!/usr/bin/env node
/**
 * Seed demo data for EnzymeForge.ai.
 *
 * Usage:
 *   1. Sign up / log in once via the UI so a profile + workspace exist.
 *   2. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY.
 *   3. `pnpm seed` (or `node scripts/seed.mjs`)
 *
 * The script attaches data to the FIRST profile / workspace it finds.
 * Run with `SEED_RESET=1` to wipe existing demo projects before reseeding.
 */

import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";

const env = await loadEnv();
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const DEMO_PROJECTS = [
  {
    name: "Ethanol → Jet Fuel (C8-C16)",
    substrate: "ethanol",
    product: "C8-C16 alkanes",
    target_reaction:
      "Ethanol → C8-C16 hydrocarbons via fatty-acid biosynthesis & aldehyde decarbonylation",
    conditions: { temperature_celsius: 30, ph: 7.0, solvent: "aqueous buffer" },
    candidates: [
      { accession: "P00330", name: "Alcohol dehydrogenase 1 (ADH1)", organism: "Saccharomyces cerevisiae", ec: "1.1.1.1", pdb: "4W6Z" },
      { accession: "P0A6R0", name: "β-ketoacyl-ACP synthase III (FabH)", organism: "Escherichia coli", ec: "2.3.1.180", pdb: "1HNJ" },
      { accession: "Q54764", name: "Aldehyde decarbonylase (ADO)", organism: "Synechococcus elongatus PCC 7942", ec: "4.1.99.5", pdb: "2OC5" },
      { accession: "P14779", name: "Cytochrome P450 BM3 (CYP102A1)", organism: "Bacillus megaterium", ec: "1.14.13.81", pdb: "1BU7" },
      { accession: "P0A9Q7", name: "Acetaldehyde dehydrogenase AdhE", organism: "Escherichia coli", ec: "1.2.1.10", pdb: null },
    ],
  },
  {
    name: "CO₂ + H₂ → Methanol via formate dehydrogenase",
    substrate: "carbon dioxide",
    product: "methanol",
    target_reaction:
      "CO2 → formate → formaldehyde → methanol via FDH/FDM/MDH cascade",
    conditions: { temperature_celsius: 37, ph: 7.5, solvent: "aqueous buffer" },
    candidates: [
      { accession: "O13437", name: "Formate dehydrogenase (FDH)", organism: "Candida boidinii", ec: "1.17.1.9", pdb: "2NAD" },
      { accession: "P14775", name: "Methanol dehydrogenase (MDH)", organism: "Methylobacterium extorquens AM1", ec: "1.1.1.244", pdb: "1H4I" },
      { accession: "P00918", name: "Carbonic anhydrase II", organism: "Homo sapiens", ec: "4.2.1.1", pdb: "2CBA" },
      { accession: "P00879", name: "RuBisCO large subunit", organism: "Synechococcus elongatus PCC 6301", ec: "4.1.1.39", pdb: "1RXO" },
    ],
  },
];

main().catch((err) => {
  console.error("[seed] failed:", err.message ?? err);
  process.exit(1);
});

async function main() {
  console.log("[seed] connecting to Supabase…");
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);
  if (profErr) throw profErr;
  if (!profiles || profiles.length === 0) {
    throw new Error(
      "No profile found. Sign up via the app first, then run `pnpm seed`.",
    );
  }
  const profile = profiles[0];

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(*)")
    .eq("user_id", profile.id)
    .limit(1);
  const workspace = memberships?.[0]?.workspaces;
  if (!workspace) throw new Error("Profile has no workspace.");
  console.log(`[seed] target workspace: ${workspace.name} (owner: ${profile.email})`);

  if (process.env.SEED_RESET === "1") {
    console.log("[seed] SEED_RESET=1 → deleting prior demo projects…");
    const names = DEMO_PROJECTS.map((p) => p.name);
    await supabase.from("projects").delete().in("name", names).eq("workspace_id", workspace.id);
  }

  for (const def of DEMO_PROJECTS) {
    console.log(`\n[seed] === ${def.name} ===`);
    const { data: existing } = await supabase
      .from("projects")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("name", def.name)
      .maybeSingle();
    if (existing) {
      console.log("  already exists; skipping");
      continue;
    }

    const { data: project, error: projErr } = await supabase
      .from("projects")
      .insert({
        workspace_id: workspace.id,
        name: def.name,
        substrate: def.substrate,
        product: def.product,
        target_reaction: def.target_reaction,
        conditions: def.conditions,
        created_by: profile.id,
      })
      .select("*")
      .single();
    if (projErr) throw projErr;
    console.log(`  project ${project.id}`);

    // Fetch real UniProt sequences for the listed candidates
    const candidates = [];
    for (const c of def.candidates) {
      const seq = await fetchUniProtSequence(c.accession);
      if (!seq) continue;
      candidates.push({ ...c, sequence: seq });
    }

    // Insert DB candidates
    const inserts = candidates.map((c) => ({
      project_id: project.id,
      source: "db",
      source_id: c.accession,
      name: c.name,
      sequence: c.sequence,
      ec_number: c.ec,
      organism: c.organism,
      pdb_id: c.pdb ?? null,
      metadata: { retrieval_source: "uniprot", function: null, length: c.sequence.length },
    }));
    const { data: dbInserted, error: candErr } = await supabase
      .from("enzyme_candidates")
      .insert(inserts)
      .select("*");
    if (candErr) throw candErr;
    console.log(`  inserted ${dbInserted.length} DB candidates`);

    // Synthesize 2-3 generated variants per top 2 parents
    const parents = dbInserted.slice(0, 2);
    const generated = [];
    for (const parent of parents) {
      for (let v = 1; v <= 3; v++) {
        const muts = generateDemoMutations(parent.sequence, v);
        const newSeq = applyMutations(parent.sequence, muts);
        generated.push({
          project_id: project.id,
          source: "generated",
          source_id: null,
          name: `${parent.name.split(/\s+/)[0]}_v${v}`,
          sequence: newSeq,
          parent_id: parent.id,
          parent_sequence: parent.sequence,
          mutations: muts,
          ec_number: parent.ec_number,
          organism: parent.organism,
          metadata: {
            generation_model: "facebook/esm2_t6_8M_UR50D",
            generation_method: "demo_seed",
            proposal_score: 0.5 + Math.random() * 0.4,
            length: newSeq.length,
          },
        });
      }
    }
    const { data: genInserted, error: genErr } = await supabase
      .from("enzyme_candidates")
      .insert(generated)
      .select("*");
    if (genErr) throw genErr;
    console.log(`  inserted ${genInserted.length} variants`);

    // Predictions for all candidates
    const allCandidates = [...dbInserted, ...genInserted];
    const predictionRows = allCandidates.map((c, i) => {
      const isVariant = c.source === "generated";
      const seedNoise = ((i * 137) % 100) / 1000;
      const activity = clamp01(0.55 + (isVariant ? 0.15 : 0.05) + seedNoise);
      const stability = clamp01(0.5 + (isVariant ? -0.05 : 0.05) + seedNoise * 0.7);
      const expression = clamp01(0.6 + seedNoise);
      const yieldRaw = Math.pow(activity, 0.4) * Math.pow(stability, 0.3) * Math.pow(expression, 0.3);
      return {
        candidate_id: c.id,
        model_version: "1.0.0",
        activity_score: round4(activity),
        stability_score: round4(stability),
        expression_score: round4(expression),
        predicted_yield: round4(yieldRaw),
        confidence_lower: round4(yieldRaw * 0.85),
        confidence_upper: round4(Math.min(1, yieldRaw * 1.15)),
        features: {
          length: c.sequence.length,
          mutation_count: (c.mutations || []).length,
          seed: true,
        },
      };
    });
    const { data: preds, error: predErr } = await supabase
      .from("predictions")
      .insert(predictionRows)
      .select("*");
    if (predErr) throw predErr;
    console.log(`  inserted ${preds.length} predictions`);

    // 8 experiments per project — measured values close to predictions but with
    // realistic deviation; mix in some underperformers.
    const expPool = allCandidates.slice(0, 8);
    const experiments = expPool.map((c, i) => {
      const pred = preds.find((p) => p.candidate_id === c.id);
      if (!pred) return null;
      const noise = (((i * 23) % 100) - 50) / 250; // ±0.2
      const big = i >= 6 ? -0.18 : 0; // last few underperform
      return {
        candidate_id: c.id,
        performed_by: profile.id,
        performed_at: new Date(Date.now() - (8 - i) * 86_400_000).toISOString(),
        measured_activity: clamp01(pred.activity_score + noise * 0.6 + big),
        measured_stability: clamp01(pred.stability_score + noise * 0.5),
        measured_yield: clamp01(pred.predicted_yield + noise + big),
        notes:
          big < 0
            ? "Lower yield than predicted; may indicate mutation in conserved region."
            : "Result aligned with prediction within expected tolerance.",
        prediction_id: pred.id,
      };
    }).filter(Boolean);
    const { error: expErr } = await supabase.from("experiments").insert(experiments);
    if (expErr) throw expErr;
    console.log(`  inserted ${experiments.length} experiments`);
  }

  // Run /api/retrain logic synthetically: insert one model_calibration row.
  await ensureCalibrationRow();

  console.log("\n[seed] done. Open the app and look at the demo projects.");
}

async function ensureCalibrationRow() {
  const { data: existing } = await supabase
    .from("model_calibration")
    .select("id")
    .eq("model_version", "1.0.1")
    .maybeSingle();
  if (existing) return;
  await supabase.from("model_calibration").insert({
    model_version: "1.0.1",
    n_observations: 16,
    mae_activity: 0.087,
    mae_stability: 0.092,
    mae_yield: 0.075,
    calibration_params: {
      activity: { slope: 0.94, intercept: 0.03 },
      stability: { slope: 0.97, intercept: 0.02 },
      yield: { slope: 0.91, intercept: 0.04 },
      hypotheses: [
        {
          kind: "recurring_mutation_in_underperformers",
          detail: "Position 142 mutated in 3 of 4 underperforming variants — conserved active-site residue likely.",
          weight: 0.75,
        },
      ],
    },
  });
  console.log("[seed] inserted demo model_calibration v1.0.1");
}

async function fetchUniProtSequence(accession) {
  try {
    const url = `https://rest.uniprot.org/uniprotkb/${accession}.fasta`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  UniProt ${accession}: HTTP ${res.status}`);
      return null;
    }
    const text = await res.text();
    return text
      .split("\n")
      .filter((l) => !l.startsWith(">"))
      .join("")
      .trim();
  } catch (e) {
    console.warn(`  UniProt ${accession}: ${e.message}`);
    return null;
  }
}

function generateDemoMutations(seq, n) {
  const positions = [
    Math.floor(seq.length * 0.25),
    Math.floor(seq.length * 0.45),
    Math.floor(seq.length * 0.65),
  ].slice(0, Math.min(2, n));
  const aaPool = "ACDEFGHIKLMNPQRSTVWY";
  return positions.map((p) => {
    const wt = seq[p];
    let alt = aaPool[(p + n) % aaPool.length];
    if (alt === wt) alt = aaPool[(p + n + 1) % aaPool.length];
    return { position: p + 1, from: wt, to: alt, score: 0.1 + (n / 10) };
  });
}

function applyMutations(seq, muts) {
  const arr = seq.split("");
  for (const m of muts) {
    if (m.position >= 1 && m.position <= arr.length) arr[m.position - 1] = m.to;
  }
  return arr.join("");
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}
function round4(x) {
  return Math.round(x * 10_000) / 10_000;
}

async function loadEnv() {
  const out = { ...process.env };
  try {
    const text = await readFile(new URL("../.env.local", import.meta.url), "utf8");
    for (const raw of text.split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 0) continue;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim();
      if (!out[k]) out[k] = v;
    }
  } catch {}
  if (!out.NEXT_PUBLIC_SUPABASE_URL || !out.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Configure .env.local first.",
    );
  }
  return out;
}
