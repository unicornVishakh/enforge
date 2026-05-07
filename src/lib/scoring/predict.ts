/**
 * Phase 4 — Prediction layer.
 *
 * Each score is in [0, 1] and is *deterministic* given the inputs (no random
 * calls; embeddings are deterministic from ESM-2). Same sequence + same
 * model_version → same scores. This is essential for the feedback-loop
 * demo (Phase 6) and for trust.
 *
 * Where this differs from production:
 *   - activity_score: a proper deployment would learn a regression head from
 *     measured activity data per EC class. We use cosine similarity + MLM
 *     score as a defensible heuristic.
 *   - stability_score: production uses ΔΔG predictors (FoldX, Rosetta
 *     ddG_monomer, ProtMPNN-Stability). We use a hydrophobic-core /
 *     length / mutation-count heuristic.
 *   - expression_score: production uses host-specific CAI + signal-peptide
 *     predictors (Phobius, SignalP). We use an AA-level rarity proxy.
 *
 * The UI labels every prediction with model_version and a "demo" badge.
 */

import { cosineSimilarity } from "@/lib/huggingface";
import type { Mutation } from "@/lib/types/database";

export const MODEL_VERSION_BASE = "1.0.0";

const RARE_AA = new Set(["W", "C", "M", "H", "U", "O"]);
const HYDROPHOBIC = new Set(["F", "I", "L", "M", "V", "W", "Y"]);

export interface PredictInput {
  sequence: string;
  embedding?: number[] | null;
  /** Embedding of the parent (for variants) — used for activity heuristic. */
  parent_embedding?: number[] | null;
  /** Mutation list (for variants); empty/missing for DB candidates. */
  mutations?: Mutation[];
  /** Optional: KEGG-derived EC numbers for this project — bonus if our EC matches. */
  project_ec_numbers?: string[];
  ec_number?: string | null;
  /** Optional calibration params (slope, intercept) per metric, if model has been retrained. */
  calibration?: CalibrationParams | null;
  /** Number of similar experimental observations available — narrows CIs. */
  similar_observations?: number;
}

export interface CalibrationParams {
  activity?: { slope: number; intercept: number };
  stability?: { slope: number; intercept: number };
  yield?: { slope: number; intercept: number };
}

export interface PredictionResult {
  model_version: string;
  activity_score: number;
  stability_score: number;
  expression_score: number;
  predicted_yield: number;
  confidence_lower: number;
  confidence_upper: number;
  features: {
    length: number;
    mutation_count: number;
    hydrophobic_core_fraction: number;
    rare_aa_fraction: number;
    has_signal_peptide_proxy: boolean;
    cosine_to_parent: number | null;
    mlm_score_sum: number;
    ec_matches_project: boolean;
  };
}

export function predictCandidate(input: PredictInput): PredictionResult {
  const seq = input.sequence.toUpperCase();
  const length = seq.length;
  const mutations = input.mutations ?? [];
  const mlmSum = mutations.reduce((acc, m) => acc + (m.score ?? 0), 0);

  // Embedding similarity to parent (if both present)
  const cosToParent =
    input.embedding && input.parent_embedding
      ? cosineSimilarity(input.embedding, input.parent_embedding)
      : null;

  // EC match to KEGG-derived ECs for this project
  const ecMatchesProject = !!(
    input.ec_number &&
    input.project_ec_numbers &&
    input.project_ec_numbers.includes(input.ec_number)
  );

  const hydroFrac = hydrophobicCoreFraction(seq);
  const rareFrac = rareAAFraction(seq);
  const hasSignal = hasSignalPeptideProxy(seq);

  // ─── activity ────────────────────────────────────────────────────────────
  // Components:
  //   - base: 0.5
  //   - cos-similarity to parent: +0.3 * cos (variants only)
  //   - MLM score weighting: up to +0.15 for top mutations
  //   - EC matches the KEGG-derived target ECs: +0.10
  //   - large mutation distance penalty: -0.05 per mutation past 2
  let activity = 0.5;
  if (cosToParent !== null) activity += 0.3 * cosToParent;
  activity += clamp01(mlmSum) * 0.15;
  if (ecMatchesProject) activity += 0.1;
  activity -= Math.max(0, mutations.length - 2) * 0.05;
  activity = clamp01(activity);

  // ─── stability ───────────────────────────────────────────────────────────
  // Components:
  //   - base: 0.5
  //   - hydrophobic-core fraction (target ~0.4–0.5): bell-shape near 0.45
  //   - length penalty (sweet spot 200–500aa)
  //   - mutation count penalty
  let stability = 0.5;
  stability += 0.4 * (1 - Math.min(1, Math.abs(hydroFrac - 0.45) / 0.45));
  stability += lengthBonus(length);
  stability -= 0.04 * mutations.length;
  stability = clamp01(stability);

  // ─── expression ──────────────────────────────────────────────────────────
  // Components:
  //   - base: 0.6 * (1 - rare AA fraction)
  //   - signal peptide check: secreted enzymes can be harder; -0.15
  //   - length penalty (very long = harder)
  let expression = 0.6 * (1 - rareFrac) + 0.3;
  if (hasSignal) expression -= 0.15;
  if (length > 800) expression -= 0.1;
  expression = clamp01(expression);

  // ─── predicted yield ─────────────────────────────────────────────────────
  // Weighted geometric mean of the three.
  const yieldRaw = Math.pow(activity, 0.4) * Math.pow(stability, 0.3) * Math.pow(expression, 0.3);

  // Apply per-metric calibration (slope*x + intercept) if available.
  const cal = input.calibration ?? null;
  const activityCal = applyCalibration(activity, cal?.activity);
  const stabilityCal = applyCalibration(stability, cal?.stability);
  const yieldCal = applyCalibration(yieldRaw, cal?.yield);

  // ─── confidence interval ─────────────────────────────────────────────────
  // Default ±15%; tightened linearly with similar_observations.
  const obs = Math.max(0, input.similar_observations ?? 0);
  const widthFraction = 0.15 / (1 + Math.sqrt(obs) * 0.3);
  const confidence_lower = clamp01(yieldCal - yieldCal * widthFraction);
  const confidence_upper = clamp01(yieldCal + yieldCal * widthFraction);

  return {
    model_version: cal ? bumpedVersion(cal) : MODEL_VERSION_BASE,
    activity_score: round4(activityCal),
    stability_score: round4(stabilityCal),
    expression_score: round4(expression),
    predicted_yield: round4(yieldCal),
    confidence_lower: round4(confidence_lower),
    confidence_upper: round4(confidence_upper),
    features: {
      length,
      mutation_count: mutations.length,
      hydrophobic_core_fraction: round4(hydroFrac),
      rare_aa_fraction: round4(rareFrac),
      has_signal_peptide_proxy: hasSignal,
      cosine_to_parent: cosToParent === null ? null : round4(cosToParent),
      mlm_score_sum: round4(mlmSum),
      ec_matches_project: ecMatchesProject,
    },
  };
}

function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function round4(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}

function applyCalibration(
  raw: number,
  cal: { slope: number; intercept: number } | undefined,
): number {
  if (!cal) return raw;
  return clamp01(cal.slope * raw + cal.intercept);
}

function lengthBonus(len: number): number {
  // Bell-shape centered around 350aa; flat 0.05 plateau between 200-500
  if (len >= 200 && len <= 500) return 0.05;
  if (len < 80) return -0.2;
  if (len > 900) return -0.15;
  return 0;
}

function hydrophobicCoreFraction(seq: string): number {
  const start = Math.floor(seq.length * 0.25);
  const end = Math.floor(seq.length * 0.75);
  if (end <= start) return 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    if (HYDROPHOBIC.has(seq[i])) count++;
  }
  return count / (end - start);
}

function rareAAFraction(seq: string): number {
  if (seq.length === 0) return 0;
  let count = 0;
  for (const aa of seq) if (RARE_AA.has(aa)) count++;
  return count / seq.length;
}

function hasSignalPeptideProxy(seq: string): boolean {
  // Heuristic: ≥6 hydrophobic residues in the first 25 = likely signal peptide.
  const head = seq.slice(0, 25);
  let h = 0;
  for (const aa of head) if (HYDROPHOBIC.has(aa)) h++;
  return h >= 6;
}

function bumpedVersion(cal: CalibrationParams): string {
  // Purely a formatting helper — actual versioning lives in model_calibration.
  const parts = MODEL_VERSION_BASE.split(".");
  const obs =
    Math.round(((cal.activity?.slope ?? 0) + (cal.stability?.slope ?? 0)) * 10) || 0;
  return `${parts[0]}.${parts[1]}.${Number(parts[2]) + obs}`;
}
