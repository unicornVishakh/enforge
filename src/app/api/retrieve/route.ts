import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/types/database";
import { searchUniProt, type UniProtHit } from "@/lib/external-apis/uniprot";
import {
  searchKEGGReactions,
  type KEGGReaction,
  type KEGGCompound,
} from "@/lib/external-apis/kegg";
import { searchBRENDA, type BRENDAEntry } from "@/lib/external-apis/brenda";
import { searchPubMed, type LiteratureHit } from "@/lib/external-apis/literature";

export const runtime = "nodejs";
export const maxDuration = 60;

const RetrieveBody = z.object({
  projectId: z.uuid(),
  /** Optional override (defaults to the project's stored substrate/product). */
  substrate: z.string().optional(),
  product: z.string().optional(),
  /** When true, ignore retrieval_cache and re-fetch. */
  force: z.boolean().optional(),
});

const CACHE_TTL_HOURS = 24;

interface RetrievedEnzyme {
  source: "uniprot" | "brenda";
  source_id: string;
  name: string;
  organism: string;
  ec_number: string | null;
  sequence: string;
  length: number;
  pdb_id: string | null;
  function: string | null;
  metadata: Record<string, unknown>;
}

interface RetrieveResponse {
  ok: boolean;
  cached: boolean;
  inserted: number;
  total: number;
  candidates: RetrievedEnzyme[];
  kegg: {
    substrate?: KEGGCompound;
    product?: KEGGCompound;
    reactions: KEGGReaction[];
    ec_numbers: string[];
  };
  literature: LiteratureHit[];
  diagnostics: {
    uniprot: { ok: boolean; count: number; error?: string };
    kegg: { ok: boolean; reactions: number; error?: string };
    brenda: { ok: boolean; count: number; source: "live" | "snapshot"; error?: string };
    pubmed: { ok: boolean; count: number; error?: string };
  };
  error?: string;
}

export async function POST(req: Request) {
  let body: z.infer<typeof RetrieveBody>;
  try {
    body = RetrieveBody.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  const { data: project, error: projErr } = await supabase
    .from("projects")
    .select("*")
    .eq("id", body.projectId)
    .maybeSingle();

  if (projErr || !project) {
    return NextResponse.json(
      { ok: false, error: projErr?.message ?? "Project not found" },
      { status: 404 },
    );
  }

  const substrate = body.substrate ?? project.substrate ?? "";
  const product = body.product ?? project.product ?? "";

  if (!substrate || !product) {
    return NextResponse.json(
      { ok: false, error: "Project missing substrate or product" },
      { status: 400 },
    );
  }

  const cacheKey = `retrieve:${substrate.toLowerCase()}::${product.toLowerCase()}`;

  // ─── Check cache ──────────────────────────────────────────────────────────
  if (!body.force) {
    const { data: cached } = await supabase
      .from("retrieval_cache")
      .select("payload, expires_at")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached) {
      const payload = cached.payload as unknown as RetrieveResponse;
      // Make sure DB candidates exist for THIS project even if cache hit.
      const inserted = await persistCandidates(
        supabase,
        body.projectId,
        payload.candidates,
      );
      return NextResponse.json({ ...payload, cached: true, inserted });
    }
  }

  // ─── Fan out to external services ─────────────────────────────────────────
  const diagnostics: RetrieveResponse["diagnostics"] = {
    uniprot: { ok: false, count: 0 },
    kegg: { ok: false, reactions: 0 },
    brenda: { ok: false, count: 0, source: "snapshot" },
    pubmed: { ok: false, count: 0 },
  };

  const queryKeyword = project.name; // free-text hint

  const [uniprotRes, keggRes, brendaRes, pubmedRes] = await Promise.allSettled([
    searchUniProt({
      substrate,
      product,
      keyword: queryKeyword,
      size: 25,
      reviewedOnly: true,
    }),
    searchKEGGReactions({ substrate, product, maxReactions: 6 }),
    searchBRENDA({ substrate, product, limit: 30 }),
    searchPubMed({
      query: `(${substrate}) AND (${product}) AND enzyme`,
      size: 6,
    }),
  ]);

  const uniprotHits: UniProtHit[] =
    uniprotRes.status === "fulfilled" ? uniprotRes.value : [];
  if (uniprotRes.status === "fulfilled") {
    diagnostics.uniprot = { ok: true, count: uniprotHits.length };
  } else {
    diagnostics.uniprot = {
      ok: false,
      count: 0,
      error: serializeError(uniprotRes.reason),
    };
  }

  const keggResult =
    keggRes.status === "fulfilled"
      ? keggRes.value
      : { reactions: [] as KEGGReaction[] };
  if (keggRes.status === "fulfilled") {
    diagnostics.kegg = { ok: true, reactions: keggResult.reactions.length };
  } else {
    diagnostics.kegg = {
      ok: false,
      reactions: 0,
      error: serializeError(keggRes.reason),
    };
  }

  const brendaEntries: BRENDAEntry[] =
    brendaRes.status === "fulfilled" ? brendaRes.value.entries : [];
  if (brendaRes.status === "fulfilled") {
    diagnostics.brenda = {
      ok: true,
      count: brendaEntries.length,
      source: brendaRes.value.source,
    };
  } else {
    diagnostics.brenda = {
      ok: false,
      count: 0,
      source: "snapshot",
      error: serializeError(brendaRes.reason),
    };
  }

  const literature: LiteratureHit[] =
    pubmedRes.status === "fulfilled" ? pubmedRes.value : [];
  if (pubmedRes.status === "fulfilled") {
    diagnostics.pubmed = { ok: true, count: literature.length };
  } else {
    diagnostics.pubmed = {
      ok: false,
      count: 0,
      error: serializeError(pubmedRes.reason),
    };
  }

  // Combine KEGG-discovered EC numbers + BRENDA + UniProt hits
  const kegg_ecs = Array.from(
    new Set(keggResult.reactions.flatMap((r) => r.ec_numbers ?? [])),
  );

  const candidates: RetrievedEnzyme[] = [];
  // UniProt hits first (have full sequences)
  for (const u of uniprotHits) {
    candidates.push({
      source: "uniprot",
      source_id: u.accession,
      name: u.name,
      organism: u.organism,
      ec_number: u.ec_number,
      sequence: u.sequence,
      length: u.length,
      pdb_id: u.pdb_id,
      function: u.function,
      metadata: { kegg_ec_match: u.ec_number ? kegg_ecs.includes(u.ec_number) : false },
    });
  }
  // BRENDA snapshot — synthetic placeholder sequences not included; we only
  // pass them through if they have a UniProt accession we can later fetch.
  // For now we record kinetic context; no DB row created without sequence.
  // Convert each BRENDA entry that has a UniProt accession into a hit by
  // doing a targeted UniProt lookup.
  if (brendaEntries.length > 0) {
    const accessions = brendaEntries
      .map((b) => b.uniprot_accession)
      .filter((a): a is string => Boolean(a))
      .filter((a) => !candidates.some((c) => c.source_id === a))
      .slice(0, 10);
    if (accessions.length > 0) {
      try {
        const brendaSeq = await searchUniProt({
          keyword: accessions.map((a) => `accession:${a}`).join(" OR "),
          size: 10,
          reviewedOnly: true,
        });
        for (const u of brendaSeq) {
          const k = brendaEntries.find((b) => b.uniprot_accession === u.accession);
          candidates.push({
            source: "brenda",
            source_id: u.accession,
            name: k?.name ?? u.name,
            organism: u.organism,
            ec_number: u.ec_number ?? k?.ec_number ?? null,
            sequence: u.sequence,
            length: u.length,
            pdb_id: u.pdb_id,
            function: k?.function_short ?? u.function,
            metadata: k
              ? {
                  km_mM: k.km_mM,
                  kcat_s: k.kcat_s,
                  optimum_temperature_c: k.optimum_temperature_c,
                  optimum_ph: k.optimum_ph,
                  reference: k.reference,
                  brenda_source: "snapshot",
                }
              : {},
          });
        }
      } catch {
        // Non-fatal — UniProt enrichment failed, BRENDA kinetics still
        // surfaced via diagnostics for the UI.
      }
    }
  }

  // ─── Dedupe (by source_id) ────────────────────────────────────────────────
  const seen = new Set<string>();
  const deduped = candidates.filter((c) => {
    if (seen.has(c.source_id)) return false;
    seen.add(c.source_id);
    return true;
  });

  // ─── Persist ──────────────────────────────────────────────────────────────
  const inserted = await persistCandidates(supabase, body.projectId, deduped);

  const responsePayload: RetrieveResponse = {
    ok: true,
    cached: false,
    inserted,
    total: deduped.length,
    candidates: deduped,
    kegg: {
      substrate: keggResult.substrate_compound,
      product: keggResult.product_compound,
      reactions: keggResult.reactions,
      ec_numbers: kegg_ecs,
    },
    literature,
    diagnostics,
  };

  // ─── Cache for 24h (best-effort) ──────────────────────────────────────────
  await supabase.from("retrieval_cache").upsert(
    {
      cache_key: cacheKey,
      source: "composite",
      payload: JSON.parse(JSON.stringify(responsePayload)) as Json,
      expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 3600_000).toISOString(),
    },
    { onConflict: "cache_key" },
  );

  // Audit
  await supabase.from("audit_log").insert({
    user_id: user.id,
    workspace_id: project.workspace_id,
    action: "retrieve.run",
    entity_type: "project",
    entity_id: project.id,
    payload: {
      substrate,
      product,
      total: deduped.length,
      diagnostics,
    },
  });

  return NextResponse.json(responsePayload);
}

async function persistCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectId: string,
  candidates: RetrievedEnzyme[],
): Promise<number> {
  if (candidates.length === 0) return 0;
  // Skip rows already present (idempotency by source_id within project).
  const { data: existing } = await supabase
    .from("enzyme_candidates")
    .select("source_id")
    .eq("project_id", projectId)
    .in(
      "source_id",
      candidates.map((c) => c.source_id),
    );
  const have = new Set((existing ?? []).map((e) => e.source_id).filter((x): x is string => Boolean(x)));

  const toInsert = candidates.filter((c) => !have.has(c.source_id));
  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from("enzyme_candidates").insert(
    toInsert.map((c) => ({
      project_id: projectId,
      source: "db" as const,
      source_id: c.source_id,
      name: c.name,
      sequence: c.sequence,
      ec_number: c.ec_number,
      organism: c.organism,
      pdb_id: c.pdb_id,
      metadata: {
        ...c.metadata,
        retrieval_source: c.source,
        function: c.function,
        length: c.length,
      },
    })),
  );
  if (error) {
    console.error("[retrieve] insert error:", error.message);
    return 0;
  }
  return toInsert.length;
}

function serializeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
