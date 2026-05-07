/**
 * UniProt REST client.
 *
 * Endpoint: https://rest.uniprot.org/uniprotkb/search
 * Docs: https://www.uniprot.org/help/api_queries
 *
 * We request the JSON response with a curated set of fields. UniProt's query
 * language is rich; for our needs we combine substrate/product/keyword into
 * a free-text query and rely on relevance ranking + reviewed=true for
 * SwissProt-only hits (high quality, ~570k entries).
 */

import { z } from "zod";
import { fetchJSON, ExternalApiError } from "./http";

const BASE = "https://rest.uniprot.org/uniprotkb/search";

// Narrow Zod schema describing only the slice of UniProt's response we use.
// The full payload is much richer; passthrough() is intentional.
const UniProtEntry = z.object({
  primaryAccession: z.string(),
  uniProtkbId: z.string().optional(),
  proteinDescription: z
    .object({
      recommendedName: z
        .object({
          fullName: z.object({ value: z.string() }).optional(),
          ecNumbers: z
            .array(z.object({ value: z.string() }))
            .optional(),
        })
        .optional(),
      submissionNames: z
        .array(
          z.object({
            fullName: z.object({ value: z.string() }).optional(),
          }),
        )
        .optional(),
    })
    .optional(),
  organism: z
    .object({
      scientificName: z.string().optional(),
      commonName: z.string().optional(),
    })
    .optional(),
  sequence: z
    .object({
      value: z.string(),
      length: z.number(),
    })
    .optional(),
  comments: z
    .array(
      z.object({
        commentType: z.string(),
        texts: z
          .array(z.object({ value: z.string() }))
          .optional(),
      }),
    )
    .optional(),
  dbCrossReferences: z
    .array(
      z.object({
        database: z.string(),
        id: z.string(),
      }),
    )
    .optional(),
});

const UniProtResponse = z.object({
  results: z.array(UniProtEntry),
});

export interface UniProtHit {
  accession: string;
  name: string;
  organism: string;
  ec_number: string | null;
  sequence: string;
  length: number;
  function: string | null;
  pdb_id: string | null;
}

function parseEntry(e: z.infer<typeof UniProtEntry>): UniProtHit | null {
  if (!e.sequence?.value) return null;

  const name =
    e.proteinDescription?.recommendedName?.fullName?.value ??
    e.proteinDescription?.submissionNames?.[0]?.fullName?.value ??
    e.uniProtkbId ??
    e.primaryAccession;

  const ec =
    e.proteinDescription?.recommendedName?.ecNumbers?.[0]?.value ?? null;

  const fnComment =
    e.comments?.find((c) => c.commentType === "FUNCTION")?.texts?.[0]?.value ??
    null;

  const pdb =
    e.dbCrossReferences?.find((x) => x.database === "PDB")?.id ?? null;

  return {
    accession: e.primaryAccession,
    name,
    organism: e.organism?.scientificName ?? e.organism?.commonName ?? "Unknown",
    ec_number: ec,
    sequence: e.sequence.value,
    length: e.sequence.length,
    function: fnComment,
    pdb_id: pdb,
  };
}

export interface UniProtSearchInput {
  substrate?: string;
  product?: string;
  keyword?: string;
  ecNumber?: string;
  /** Limit results — UniProt caps at 500 per page. */
  size?: number;
  /** Restrict to reviewed (SwissProt) entries — higher quality. */
  reviewedOnly?: boolean;
}

export async function searchUniProt(
  input: UniProtSearchInput,
): Promise<UniProtHit[]> {
  const queryParts: string[] = [];
  if (input.ecNumber) queryParts.push(`ec:${input.ecNumber}`);
  if (input.keyword) queryParts.push(`(${input.keyword})`);

  // Free-text substrate/product search — UniProt indexes substrate, product,
  // and pathway annotations.
  const subj: string[] = [];
  if (input.substrate) subj.push(input.substrate);
  if (input.product) subj.push(input.product);
  if (subj.length > 0) {
    queryParts.push(`(${subj.map((s) => `"${escapeQuery(s)}"`).join(" OR ")})`);
  }

  if (queryParts.length === 0) return [];

  if (input.reviewedOnly !== false) {
    queryParts.push("reviewed:true");
  }

  const params = new URLSearchParams({
    query: queryParts.join(" AND "),
    format: "json",
    size: String(input.size ?? 25),
    fields: [
      "accession",
      "id",
      "protein_name",
      "organism_name",
      "sequence",
      "ec",
      "length",
      "cc_function",
      "xref_pdb",
    ].join(","),
  });

  try {
    const raw = await fetchJSON<unknown>(`${BASE}?${params.toString()}`, {
      source: "UniProt",
      timeoutMs: 20_000,
    });
    const parsed = UniProtResponse.safeParse(raw);
    if (!parsed.success) {
      throw new ExternalApiError(
        `UniProt response parse error: ${parsed.error.message.slice(0, 200)}`,
        "UniProt",
      );
    }
    return parsed.data.results.map(parseEntry).filter((x): x is UniProtHit => x !== null);
  } catch (e) {
    if (e instanceof ExternalApiError) throw e;
    throw new ExternalApiError(
      `UniProt search failed: ${(e as Error).message}`,
      "UniProt",
      undefined,
      e,
    );
  }
}

function escapeQuery(s: string): string {
  return s.replace(/["\\]/g, "\\$&");
}
