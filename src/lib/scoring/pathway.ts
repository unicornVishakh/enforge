/**
 * Pathway designer — Phase 5.
 *
 * Builds a directed graph from a substrate compound to a product compound
 * by BFS over KEGG's compound↔reaction bipartite graph (max 3 hops). For
 * each edge in the discovered path we attach:
 *   - the catalyzing EC number (from KEGG)
 *   - the best candidate enzyme this project has for that EC (by predicted
 *     yield), if any; otherwise the top BRENDA snapshot match
 *
 * Flux is a coarse proxy: predicted_flux = bottleneck_activity × length_penalty
 * where bottleneck_activity = min(activity_score) along the path.
 */

import { fetchText } from "@/lib/external-apis/http";
import { searchBRENDASnapshot, type BRENDAEntry } from "@/lib/external-apis/brenda-snapshot";

const KEGG_BASE = "https://rest.kegg.jp";

export interface PathwayNode {
  id: string;
  label: string;
  cpd_id: string;
  is_substrate?: boolean;
  is_product?: boolean;
}

export interface PathwayEdge {
  id: string;
  source: string;
  target: string;
  reaction_id: string;
  ec_number: string | null;
  best_candidate_id: string | null;
  best_candidate_name: string | null;
  best_candidate_activity: number | null;
  brenda_fallback: BRENDAEntry | null;
  is_bottleneck: boolean;
}

export interface PathwayGraph {
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  predicted_flux: number;
  bottleneck_edge_id: string | null;
  bottleneck_explanation: string | null;
}

interface CandidateInfo {
  id: string;
  name: string;
  ec_number: string | null;
  activity_score: number;
}

interface BuildOptions {
  substrate_cpd_id: string;
  product_cpd_id: string;
  candidates: CandidateInfo[];
  /** Max hops between substrate and product (≥1). */
  maxHops?: number;
}

interface ReactionInfo {
  rxn_id: string;
  equation: string;
  ec_numbers: string[];
  participants: string[]; // compound IDs in the equation
}

const reactionCache = new Map<string, ReactionInfo>();
const compoundReactionsCache = new Map<string, string[]>();

async function getCompoundReactions(cpd_id: string): Promise<string[]> {
  if (compoundReactionsCache.has(cpd_id)) {
    return compoundReactionsCache.get(cpd_id)!;
  }
  const text = await fetchText(`${KEGG_BASE}/link/reaction/cpd:${cpd_id}`, {
    source: "KEGG",
    timeoutMs: 12_000,
  }).catch(() => "");
  if (!text.trim()) {
    compoundReactionsCache.set(cpd_id, []);
    return [];
  }
  const ids = text
    .trim()
    .split("\n")
    .map((l) => l.split("\t")[1]?.replace(/^rn:/, ""))
    .filter((x): x is string => Boolean(x));
  compoundReactionsCache.set(cpd_id, ids);
  return ids;
}

async function getReaction(rxn_id: string): Promise<ReactionInfo | null> {
  if (reactionCache.has(rxn_id)) return reactionCache.get(rxn_id)!;
  const text = await fetchText(`${KEGG_BASE}/get/rn:${rxn_id}`, {
    source: "KEGG",
    timeoutMs: 12_000,
  }).catch(() => "");
  if (!text.trim()) return null;

  const ec_numbers: string[] = [];
  const participants: string[] = [];
  let equation = "";
  let section = "";
  for (const rawLine of text.split("\n")) {
    if (!rawLine || rawLine === "///") continue;
    if (/^[A-Z]/.test(rawLine)) section = rawLine.split(/\s+/)[0];
    const line = rawLine.replace(/^\S+\s+/, "");
    if (section === "EQUATION" && !equation) equation = line;
    if (section === "ENZYME") ec_numbers.push(...line.split(/\s+/).filter(Boolean));
    if (section === "EQUATION" || section === "DEFINITION") {
      const matches = line.match(/C\d{5}/g);
      if (matches) participants.push(...matches);
    }
  }
  const info: ReactionInfo = {
    rxn_id,
    equation,
    ec_numbers,
    participants: Array.from(new Set(participants)),
  };
  reactionCache.set(rxn_id, info);
  return info;
}

/**
 * BFS from substrate to product on the compound↔reaction bipartite graph.
 * Returns the sequence of (reaction, next_compound) hops.
 */
export async function findShortestPath(
  substrate: string,
  product: string,
  maxHops: number,
): Promise<{ reactions: string[]; compounds: string[] } | null> {
  // Each search node = compound id. Edge = reaction.
  if (substrate === product) return { reactions: [], compounds: [substrate] };

  type Node = { cpd: string; path_rxns: string[]; path_cpds: string[] };
  const queue: Node[] = [{ cpd: substrate, path_rxns: [], path_cpds: [substrate] }];
  const visited = new Set<string>([substrate]);

  while (queue.length > 0) {
    const node = queue.shift()!;
    if (node.path_rxns.length >= maxHops) continue;
    const reactions = await getCompoundReactions(node.cpd);
    // Cap fan-out so we don't blow KEGG's quota.
    for (const rxn of reactions.slice(0, 12)) {
      const info = await getReaction(rxn);
      if (!info) continue;
      for (const next of info.participants) {
        if (next === node.cpd) continue;
        if (visited.has(next)) continue;
        visited.add(next);
        const newPathRxns = [...node.path_rxns, rxn];
        const newPathCpds = [...node.path_cpds, next];
        if (next === product) {
          return { reactions: newPathRxns, compounds: newPathCpds };
        }
        queue.push({ cpd: next, path_rxns: newPathRxns, path_cpds: newPathCpds });
      }
    }
  }
  return null;
}

export async function buildPathwayGraph(
  opts: BuildOptions,
): Promise<PathwayGraph> {
  const maxHops = Math.max(1, Math.min(opts.maxHops ?? 3, 4));
  const path = await findShortestPath(
    opts.substrate_cpd_id,
    opts.product_cpd_id,
    maxHops,
  );

  if (!path || path.reactions.length === 0) {
    // Synthesize a placeholder 1-hop graph so the UI has something to show.
    return {
      nodes: [
        {
          id: opts.substrate_cpd_id,
          cpd_id: opts.substrate_cpd_id,
          label: opts.substrate_cpd_id,
          is_substrate: true,
        },
        {
          id: opts.product_cpd_id,
          cpd_id: opts.product_cpd_id,
          label: opts.product_cpd_id,
          is_product: true,
        },
      ],
      edges: [],
      predicted_flux: 0,
      bottleneck_edge_id: null,
      bottleneck_explanation:
        "No path found in KEGG between these compounds within the search budget.",
    };
  }

  const nodes: PathwayNode[] = path.compounds.map((cpd, idx) => ({
    id: cpd,
    cpd_id: cpd,
    label: cpd,
    is_substrate: idx === 0,
    is_product: idx === path.compounds.length - 1,
  }));

  const edgeInfos = await Promise.all(path.reactions.map((r) => getReaction(r)));
  const edges: PathwayEdge[] = [];
  let minActivity = 1;
  let bottleneckId: string | null = null;

  for (let i = 0; i < path.reactions.length; i++) {
    const rxn = edgeInfos[i];
    const ec = rxn?.ec_numbers[0] ?? null;
    const best = ec
      ? opts.candidates
          .filter((c) => c.ec_number === ec)
          .sort((a, b) => b.activity_score - a.activity_score)[0]
      : null;
    const brenda =
      !best && ec
        ? searchBRENDASnapshot({ ec_number: ec, limit: 1 })[0] ?? null
        : null;
    const activity = best?.activity_score ?? 0.4; // unknown enzymes default low

    if (activity < minActivity) {
      minActivity = activity;
      bottleneckId = `e_${i}`;
    }
    edges.push({
      id: `e_${i}`,
      source: path.compounds[i],
      target: path.compounds[i + 1],
      reaction_id: path.reactions[i],
      ec_number: ec,
      best_candidate_id: best?.id ?? null,
      best_candidate_name: best?.name ?? null,
      best_candidate_activity: best?.activity_score ?? null,
      brenda_fallback: brenda,
      is_bottleneck: false,
    });
  }
  if (bottleneckId) {
    const idx = edges.findIndex((e) => e.id === bottleneckId);
    if (idx >= 0) edges[idx].is_bottleneck = true;
  }

  // Length penalty: longer paths are intrinsically lower flux.
  const lengthPenalty = Math.max(0.5, 1 - 0.1 * (path.reactions.length - 1));
  const predictedFlux = round4(minActivity * lengthPenalty);

  const bottleneckEdge = edges.find((e) => e.is_bottleneck);
  const bottleneckExplanation = bottleneckEdge
    ? `Limited by reaction ${bottleneckEdge.reaction_id}` +
      (bottleneckEdge.best_candidate_name
        ? ` — best candidate ${bottleneckEdge.best_candidate_name} has activity ${bottleneckEdge.best_candidate_activity?.toFixed(3)}.`
        : ` — no scored candidate yet for EC ${bottleneckEdge.ec_number ?? "?"}.`)
    : null;

  return {
    nodes,
    edges,
    predicted_flux: predictedFlux,
    bottleneck_edge_id: bottleneckId,
    bottleneck_explanation: bottleneckExplanation,
  };
}

function round4(x: number): number {
  return Math.round(x * 10_000) / 10_000;
}
