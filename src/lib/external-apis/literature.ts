/**
 * NCBI E-utilities (PubMed) client.
 *
 * Endpoints:
 *   esearch.fcgi  → list of PMIDs for a query
 *   esummary.fcgi → titles, authors, journal, year for each PMID
 *
 * Docs: https://www.ncbi.nlm.nih.gov/books/NBK25500/
 *
 * NCBI requests we identify our app via `tool=` and `email=` params. We
 * include sane defaults; if NCBI ever rate-limits, swap to an env-config'd
 * email.
 */

import { z } from "zod";
import { fetchJSON, ExternalApiError } from "./http";

const ESEARCH_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const ESUMMARY_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

const ESearchResponse = z.object({
  esearchresult: z.object({
    idlist: z.array(z.string()),
    count: z.string().optional(),
  }),
});

const ESummaryResponse = z.object({
  result: z.record(
    z.string(),
    z
      .object({
        uid: z.string().optional(),
        title: z.string().optional(),
        pubdate: z.string().optional(),
        fulljournalname: z.string().optional(),
        authors: z
          .array(z.object({ name: z.string() }))
          .optional(),
      })
      .passthrough()
      .optional(),
  ),
});

export interface LiteratureHit {
  pmid: string;
  title: string;
  journal: string | null;
  year: string | null;
  first_author: string | null;
  url: string;
}

export interface LiteratureSearchInput {
  query: string;
  /** Max results — keep small; 5 is plenty for "recent literature" panel. */
  size?: number;
}

export async function searchPubMed(
  input: LiteratureSearchInput,
): Promise<LiteratureHit[]> {
  if (!input.query.trim()) return [];

  // 1) PMID search
  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: input.query,
    retmax: String(input.size ?? 5),
    retmode: "json",
    sort: "pub_date",
    tool: "EnzymeForge.ai",
    email: "noreply@enzymeforge.ai",
  });

  const searchRaw = await fetchJSON<unknown>(
    `${ESEARCH_BASE}?${searchParams.toString()}`,
    { source: "PubMed", timeoutMs: 12_000 },
  );
  const search = ESearchResponse.safeParse(searchRaw);
  if (!search.success) {
    throw new ExternalApiError(
      `PubMed esearch parse error: ${search.error.message.slice(0, 200)}`,
      "PubMed",
    );
  }
  const pmids = search.data.esearchresult.idlist;
  if (pmids.length === 0) return [];

  // 2) Summary fetch
  const summaryParams = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    retmode: "json",
    tool: "EnzymeForge.ai",
    email: "noreply@enzymeforge.ai",
  });
  const summaryRaw = await fetchJSON<unknown>(
    `${ESUMMARY_BASE}?${summaryParams.toString()}`,
    { source: "PubMed", timeoutMs: 12_000 },
  );
  const summary = ESummaryResponse.safeParse(summaryRaw);
  if (!summary.success) {
    throw new ExternalApiError(
      `PubMed esummary parse error: ${summary.error.message.slice(0, 200)}`,
      "PubMed",
    );
  }

  return pmids
    .map((pmid) => {
      const entry = summary.data.result[pmid];
      if (!entry) return null;
      const year = entry.pubdate?.split(" ")[0] ?? null;
      return {
        pmid,
        title: entry.title ?? "(untitled)",
        journal: entry.fulljournalname ?? null,
        year,
        first_author: entry.authors?.[0]?.name ?? null,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      };
    })
    .filter((x): x is LiteratureHit => x !== null);
}
