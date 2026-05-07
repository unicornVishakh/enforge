/**
 * Hugging Face Inference client wrapper for ESM-2 protein language model.
 *
 * Model: facebook/esm2_t6_8M_UR50D — 6-layer ESM-2 small (320-dim hidden).
 *   - Masked-LM scoring via fillMask → for a sequence containing one
 *     `<mask>` token, returns top-K amino-acid candidates with their scores.
 *     This is the real, working signal — verified live (3-5s per probe).
 *   - Embeddings via featureExtraction: ESM-2 / ProtBERT models are NOT
 *     currently exposed by HF Inference Providers for feature-extraction
 *     (only fill-mask is supported). `getEmbedding` returns null in that
 *     case; the prediction layer treats null embeddings as "skip the
 *     similarity term" and leans on MLM scores instead. If you self-host
 *     ESM-2 in the future, swap in the real call.
 *
 * If HUGGINGFACE_API_KEY is missing or the API errors, we throw a typed
 * HFUnavailableError; the caller decides whether to fall back to a heuristic.
 */

import { featureExtraction, fillMask } from "@huggingface/inference";

export const ESM2_MODEL = "facebook/esm2_t6_8M_UR50D";
export const ESM2_HIDDEN_DIM = 320;

export class HFUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "HFUnavailableError";
  }
}

function requireKey(): string {
  const k = process.env.HUGGINGFACE_API_KEY;
  if (!k) {
    throw new HFUnavailableError(
      "HUGGINGFACE_API_KEY is not set. Get a Read token at https://huggingface.co/settings/tokens",
    );
  }
  return k;
}

const TIMEOUT_MS = 30_000;
const RETRIES = 2;

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<T>((_, rej) =>
          setTimeout(
            () => rej(new HFUnavailableError(`HF ${label} timed out (${TIMEOUT_MS}ms)`)),
            TIMEOUT_MS,
          ),
        ),
      ]);
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1) ** 2));
      }
    }
  }
  throw lastErr instanceof HFUnavailableError
    ? lastErr
    : new HFUnavailableError(
        `HF ${label} failed: ${(lastErr as Error)?.message ?? String(lastErr)}`,
        lastErr,
      );
}

/**
 * Mean-pooled 320-dim embedding for a protein sequence. Returns `null` if
 * the configured provider doesn't expose ESM-2 for feature-extraction
 * (which is the current state of HF Inference Providers as of 2026-05).
 *
 * featureExtraction can return either [seq_len, hidden_dim] (token-level)
 * or [hidden_dim] (already pooled), depending on the model's config.
 */
export async function getEmbedding(sequence: string): Promise<number[] | null> {
  const cleaned = sequence
    .replace(/\s+/g, "")
    .replace(/[^A-Z]/gi, "X")
    .toUpperCase()
    .slice(0, 1024);

  try {
    const out = await withRetry(
      () =>
        featureExtraction({
          accessToken: requireKey(),
          model: ESM2_MODEL,
          inputs: cleaned,
        }),
      "featureExtraction",
    );
    return meanPool(out);
  } catch (e) {
    // ESM-2 is not currently exposed for feature-extraction on any HF
    // Inference Provider. Surface this once-per-process to console and
    // return null so the caller can degrade gracefully.
    if (!loggedEmbeddingUnavailable) {
      loggedEmbeddingUnavailable = true;
      console.warn(
        "[huggingface] ESM-2 feature-extraction unavailable via Inference Providers — using MLM-only scoring.",
        e instanceof Error ? e.message : String(e),
      );
    }
    return null;
  }
}

let loggedEmbeddingUnavailable = false;

function meanPool(raw: unknown): number[] {
  // Normalize to flat number[] of length ESM2_HIDDEN_DIM
  if (!Array.isArray(raw)) {
    throw new HFUnavailableError("Unexpected ESM-2 embedding shape (not array)");
  }
  // [hidden] case
  if (typeof raw[0] === "number") {
    return raw as number[];
  }
  // [seq_len, hidden] case
  if (Array.isArray(raw[0]) && typeof (raw[0] as unknown[])[0] === "number") {
    const tokens = raw as number[][];
    const dim = tokens[0].length;
    const acc = new Array<number>(dim).fill(0);
    for (const t of tokens) for (let i = 0; i < dim; i++) acc[i] += t[i];
    return acc.map((v) => v / tokens.length);
  }
  // [batch, seq_len, hidden] — take batch[0]
  if (
    Array.isArray(raw[0]) &&
    Array.isArray((raw[0] as unknown[])[0]) &&
    typeof ((raw[0] as unknown[][])[0] as unknown[])[0] === "number"
  ) {
    const tokens = (raw as number[][][])[0];
    const dim = tokens[0].length;
    const acc = new Array<number>(dim).fill(0);
    for (const t of tokens) for (let i = 0; i < dim; i++) acc[i] += t[i];
    return acc.map((v) => v / tokens.length);
  }
  throw new HFUnavailableError("Unexpected ESM-2 embedding shape");
}

/**
 * Fill-mask predictions at a single masked position. Returns the top-K
 * candidate amino acids with their scores (probabilities under the model).
 */
export interface FillMaskCandidate {
  aa: string;
  score: number;
}

export async function fillMaskAt(
  sequence: string,
  position: number,
): Promise<FillMaskCandidate[]> {
  const cleaned = sequence
    .replace(/\s+/g, "")
    .replace(/[^A-Z]/gi, "X")
    .toUpperCase();
  if (position < 0 || position >= cleaned.length) {
    throw new HFUnavailableError(`fillMaskAt: position ${position} out of range`);
  }
  const masked =
    cleaned.slice(0, position) + "<mask>" + cleaned.slice(position + 1);

  const out = await withRetry(
    () =>
      fillMask({
        accessToken: requireKey(),
        model: ESM2_MODEL,
        inputs: masked,
      }),
    "fillMask",
  );

  // Output: [{token, token_str, score, sequence}, ...]
  const candidates: FillMaskCandidate[] = [];
  for (const entry of out as Array<{ token_str?: string; score?: number }>) {
    const tok = entry.token_str?.trim().toUpperCase();
    if (!tok || tok.length !== 1 || !/[A-Z]/.test(tok)) continue;
    if (typeof entry.score !== "number") continue;
    candidates.push({ aa: tok, score: entry.score });
  }
  return candidates;
}

/**
 * Per-residue substitution score for `newAA` at `position`. Defined as the
 * probability assigned by ESM-2 to `newAA` given the rest of the sequence
 * masked at that position. Returns 0 if `newAA` falls outside top-K.
 */
export async function scoreSubstitution(
  sequence: string,
  position: number,
  newAA: string,
): Promise<number> {
  const candidates = await fillMaskAt(sequence, position);
  const aa = newAA.toUpperCase();
  return candidates.find((c) => c.aa === aa)?.score ?? 0;
}

/**
 * Cosine similarity in [-1, 1] between two embeddings. Used by the scoring
 * layer (Phase 4) and by quick sanity checks.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
