/**
 * KEGG REST client.
 *
 * Endpoint: https://rest.kegg.jp/
 * Docs: https://www.kegg.jp/kegg/rest/keggapi.html
 *
 * KEGG endpoints return tab-separated text (not JSON). The endpoints we use:
 *   - find/compound/<term>             → "cpd:CXXXXX\tname1; name2; …"
 *   - find/reaction/<term>             → "rn:RXXXXX\tequation"
 *   - get/<rn:RXXXXX>                  → flat-file entry with EC + ENZYME ids
 *   - link/pathway/<rn:RXXXXX>         → "rn:RXXXXX\tpath:rnXXXXX"
 *
 * Resolution strategy: substrate name → compound ID → reactions involving
 * that compound, then filter for those that also include the product ID.
 */

import { fetchText, ExternalApiError } from "./http";

const BASE = "https://rest.kegg.jp";

export interface KEGGCompound {
  cpd_id: string; // e.g. "C00469"
  primary_name: string; // first synonym
  synonyms: string[];
}

export interface KEGGReaction {
  reaction_id: string; // e.g. "R00746"
  equation: string;
  ec_numbers: string[];
  pathway_ids: string[];
}

async function findCompounds(term: string): Promise<KEGGCompound[]> {
  const url = `${BASE}/find/compound/${encodeURIComponent(term)}`;
  const text = await fetchText(url, { source: "KEGG", timeoutMs: 15_000 });
  if (!text.trim()) return [];
  const all = text
    .trim()
    .split("\n")
    .map((line) => {
      const [idCol, nameCol] = line.split("\t");
      if (!idCol || !nameCol) return null;
      const cpd_id = idCol.replace(/^cpd:/, "");
      const synonyms = nameCol.split(";").map((s) => s.trim()).filter(Boolean);
      return {
        cpd_id,
        primary_name: synonyms[0] ?? cpd_id,
        synonyms,
      };
    })
    .filter((x): x is KEGGCompound => x !== null);

  // KEGG's `find/compound/X` returns compounds whose name *contains* X,
  // which produces false positives (searching "ethanol" returns "methanol",
  // "ethanolamine", etc.). Prefer compounds whose synonyms include `term`
  // as a complete word.
  const termLower = term.toLowerCase().trim();
  const exact = all.filter((c) =>
    c.synonyms.some((s) => s.toLowerCase().trim() === termLower),
  );
  return exact.length > 0 ? [...exact, ...all.filter((c) => !exact.includes(c))] : all;
}

/**
 * Returns reactions whose equation contains the given compound ID. KEGG
 * doesn't provide a direct query for "all reactions involving compound X",
 * so we use the link endpoint.
 */
async function reactionsForCompound(cpd_id: string): Promise<string[]> {
  const url = `${BASE}/link/reaction/cpd:${cpd_id}`;
  const text = await fetchText(url, { source: "KEGG", timeoutMs: 15_000 });
  if (!text.trim()) return [];
  return text
    .trim()
    .split("\n")
    .map((line) => line.split("\t")[1]?.replace(/^rn:/, ""))
    .filter((x): x is string => Boolean(x));
}

/**
 * Parses a KEGG flat-file entry for a reaction. Lines look like:
 *
 *   ENTRY       R00746                      Reaction
 *   NAME        ethanol:NAD+ oxidoreductase
 *   DEFINITION  Ethanol + NAD+ <=> Acetaldehyde + NADH + H+
 *   EQUATION    C00469 + C00003 <=> C00084 + C00004 + C00080
 *   ENZYME      1.1.1.1
 *   PATHWAY     rn00010  Glycolysis / Gluconeogenesis
 */
function parseReactionEntry(text: string): {
  equation: string;
  ec_numbers: string[];
  pathway_ids: string[];
} {
  const ec_numbers: string[] = [];
  const pathway_ids: string[] = [];
  let equation = "";

  let currentSection = "";
  for (const rawLine of text.split("\n")) {
    if (!rawLine || rawLine === "///") continue;
    const startsWithSection = /^[A-Z]/.test(rawLine);
    const line = rawLine.replace(/^\S+\s+/, "");
    if (startsWithSection) currentSection = rawLine.split(/\s+/)[0];
    if (currentSection === "EQUATION" && !equation) equation = line;
    if (currentSection === "ENZYME") {
      ec_numbers.push(...line.split(/\s+/).filter(Boolean));
    }
    if (currentSection === "PATHWAY") {
      const m = line.match(/(rn\d{5})/);
      if (m) pathway_ids.push(m[1]);
    }
  }
  return { equation, ec_numbers, pathway_ids };
}

async function getReaction(rxId: string): Promise<KEGGReaction | null> {
  const url = `${BASE}/get/rn:${rxId}`;
  try {
    const text = await fetchText(url, { source: "KEGG", timeoutMs: 15_000 });
    if (!text.trim()) return null;
    const parsed = parseReactionEntry(text);
    return { reaction_id: rxId, ...parsed };
  } catch (e) {
    if (e instanceof ExternalApiError && e.status === 404) return null;
    throw e;
  }
}

export interface KEGGSearchInput {
  substrate: string;
  product: string;
  /** Maximum reactions to fetch in detail. KEGG /get is one-at-a-time. */
  maxReactions?: number;
}

export interface KEGGSearchResult {
  substrate_compound?: KEGGCompound;
  product_compound?: KEGGCompound;
  reactions: KEGGReaction[];
}

export async function searchKEGGReactions(
  input: KEGGSearchInput,
): Promise<KEGGSearchResult> {
  const max = input.maxReactions ?? 6;

  const [subCpds, prodCpds] = await Promise.all([
    findCompounds(input.substrate).catch(() => []),
    findCompounds(input.product).catch(() => []),
  ]);

  const subCpd = subCpds[0];
  const prodCpd = prodCpds[0];

  if (!subCpd) {
    return { reactions: [], product_compound: prodCpd };
  }

  // Step 2: get reactions involving the substrate
  const subRxnIds = await reactionsForCompound(subCpd.cpd_id);

  // If we have a product compound, prefer reactions that also involve it.
  let candidateIds: string[] = subRxnIds;
  if (prodCpd) {
    const prodRxnIds = new Set(await reactionsForCompound(prodCpd.cpd_id));
    const intersected = subRxnIds.filter((id) => prodRxnIds.has(id));
    candidateIds = intersected.length > 0 ? intersected : subRxnIds;
  }

  candidateIds = Array.from(new Set(candidateIds)).slice(0, max);

  const reactions = (
    await Promise.all(candidateIds.map((id) => getReaction(id).catch(() => null)))
  ).filter((r): r is KEGGReaction => r !== null);

  return {
    substrate_compound: subCpd,
    product_compound: prodCpd,
    reactions,
  };
}
