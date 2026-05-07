"use client";

import { useState, useTransition } from "react";
import {
  ArrowUpDown,
  Database,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface RetrievedEnzyme {
  id?: string;
  source: "uniprot" | "brenda";
  source_id: string;
  name: string;
  organism: string;
  ec_number: string | null;
  sequence: string;
  length: number;
  pdb_id: string | null;
  function: string | null;
  metadata?: Record<string, unknown>;
}

interface KEGGSummary {
  substrate?: { cpd_id: string; primary_name: string };
  product?: { cpd_id: string; primary_name: string };
  reactions: Array<{
    reaction_id: string;
    equation: string;
    ec_numbers: string[];
    pathway_ids: string[];
  }>;
  ec_numbers: string[];
}

interface LiteratureHit {
  pmid: string;
  title: string;
  journal: string | null;
  year: string | null;
  first_author: string | null;
  url: string;
}

export interface InitialRetrievalState {
  candidates: RetrievedEnzyme[];
  kegg?: KEGGSummary;
  literature: LiteratureHit[];
  diagnostics?: Record<string, unknown>;
  cached?: boolean;
}

interface Props {
  projectId: string;
  substrate: string;
  product: string;
  initial: InitialRetrievalState;
  onAdvance?: () => void;
}

export function RetrieveStep({
  projectId,
  substrate: initSub,
  product: initProd,
  initial,
  onAdvance,
}: Props) {
  const [substrate, setSubstrate] = useState(initSub);
  const [product, setProduct] = useState(initProd);
  const [results, setResults] = useState<InitialRetrievalState>(initial);
  const [pending, startTransition] = useTransition();
  const [sortBy, setSortBy] = useState<"name" | "organism" | "length" | "ec">(
    "name",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  function runRetrieval(force = false) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/retrieve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, substrate, product, force }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as InitialRetrievalState & {
          inserted: number;
          total: number;
        };
        setResults(data);
        toast.success(
          data.cached
            ? `Cached: ${data.candidates.length} candidates`
            : `Retrieved ${data.total} candidates (${data.inserted} new)`,
        );
      } catch (e) {
        toast.error(`Retrieval failed: ${(e as Error).message}`);
      }
    });
  }

  const sorted = [...results.candidates].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1;
    switch (sortBy) {
      case "name":
        return dir * a.name.localeCompare(b.name);
      case "organism":
        return dir * a.organism.localeCompare(b.organism);
      case "length":
        return dir * (a.length - b.length);
      case "ec":
        return dir * (a.ec_number ?? "").localeCompare(b.ec_number ?? "");
    }
  });

  function toggleSort(col: "name" | "organism" | "length" | "ec") {
    if (sortBy === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Card className="space-y-4 p-5">
          <header className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Step 1 — Retrieve</h2>
              <p className="text-muted-foreground text-xs">
                Pulls enzymes from UniProt, KEGG, and BRENDA in parallel.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => runRetrieval(false)}
              disabled={pending}
            >
              {pending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Retrieving…
                </>
              ) : (
                <>
                  <Database />
                  Run retrieval
                </>
              )}
            </Button>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="substrate-in" className="text-xs">
                Substrate
              </Label>
              <Input
                id="substrate-in"
                value={substrate}
                onChange={(e) => setSubstrate(e.target.value)}
                placeholder="ethanol"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="product-in" className="text-xs">
                Product
              </Label>
              <Input
                id="product-in"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="C8-C16 alkanes"
              />
            </div>
          </div>
          {results.cached && (
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              Result served from 24h cache. Click Run retrieval to refresh.
            </p>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-border/40 flex items-center justify-between border-b p-4">
            <div>
              <h3 className="text-sm font-semibold">
                Retrieved enzymes
                <span className="text-muted-foreground ml-2 font-mono text-xs">
                  {sorted.length}
                </span>
              </h3>
              <p className="text-muted-foreground text-[11px]">
                Click a column header to sort. Click a row to open detail.
              </p>
            </div>
            {results.candidates.length > 0 && onAdvance && (
              <Button size="sm" variant="outline" onClick={onAdvance}>
                Continue
                <Sparkles className="size-3.5" />
              </Button>
            )}
          </div>

          {pending && results.candidates.length === 0 ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground text-sm">
                No candidates yet. Click Run retrieval to start.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground bg-muted/30 text-[11px] tracking-wider uppercase">
                  <tr>
                    <SortHeader
                      onClick={() => toggleSort("name")}
                      active={sortBy === "name"}
                    >
                      Name
                    </SortHeader>
                    <SortHeader
                      onClick={() => toggleSort("ec")}
                      active={sortBy === "ec"}
                    >
                      EC
                    </SortHeader>
                    <SortHeader
                      onClick={() => toggleSort("organism")}
                      active={sortBy === "organism"}
                    >
                      Organism
                    </SortHeader>
                    <SortHeader
                      onClick={() => toggleSort("length")}
                      active={sortBy === "length"}
                    >
                      Length
                    </SortHeader>
                    <th className="px-3 py-2 text-left">Source</th>
                    <th className="px-3 py-2 text-right">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-border/40 divide-y">
                  {sorted.map((c) => (
                    <tr
                      key={c.source_id}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-medium">{c.name}</div>
                        {c.function && (
                          <div className="text-muted-foreground line-clamp-1 text-[11px]">
                            {c.function}
                          </div>
                        )}
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5 font-mono text-xs">
                        {c.ec_number ?? "—"}
                      </td>
                      <td className="text-muted-foreground px-3 py-2.5 text-xs italic">
                        {c.organism}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {c.length}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {c.source}
                        </Badge>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <a
                          href={`https://www.uniprot.org/uniprotkb/${c.source_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline"
                        >
                          <ExternalLink className="inline-block size-3.5" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <aside className="space-y-4">
        {results.kegg && (results.kegg.reactions.length > 0 || results.kegg.substrate) && (
          <Card className="space-y-2 p-4">
            <h4 className="text-xs font-semibold tracking-wide uppercase">
              KEGG context
            </h4>
            {results.kegg.substrate && (
              <div className="text-xs">
                <span className="text-muted-foreground">Substrate:</span>{" "}
                <a
                  href={`https://www.kegg.jp/entry/${results.kegg.substrate.cpd_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-mono hover:underline"
                >
                  {results.kegg.substrate.cpd_id}
                </a>{" "}
                <span className="text-muted-foreground">
                  ({results.kegg.substrate.primary_name})
                </span>
              </div>
            )}
            {results.kegg.product && (
              <div className="text-xs">
                <span className="text-muted-foreground">Product:</span>{" "}
                <a
                  href={`https://www.kegg.jp/entry/${results.kegg.product.cpd_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent font-mono hover:underline"
                >
                  {results.kegg.product.cpd_id}
                </a>{" "}
                <span className="text-muted-foreground">
                  ({results.kegg.product.primary_name})
                </span>
              </div>
            )}
            {results.kegg.ec_numbers.length > 0 && (
              <div>
                <p className="text-muted-foreground mt-2 text-[10px] tracking-wider uppercase">
                  EC numbers in matched reactions
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {results.kegg.ec_numbers.slice(0, 12).map((ec) => (
                    <Badge
                      key={ec}
                      variant="outline"
                      className="font-mono text-[10px]"
                    >
                      {ec}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {results.kegg.reactions.length > 0 && (
              <div>
                <p className="text-muted-foreground mt-2 text-[10px] tracking-wider uppercase">
                  Reactions
                </p>
                <ul className="mt-1 space-y-1">
                  {results.kegg.reactions.slice(0, 4).map((r) => (
                    <li key={r.reaction_id} className="text-xs">
                      <a
                        href={`https://www.kegg.jp/entry/${r.reaction_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent font-mono hover:underline"
                      >
                        {r.reaction_id}
                      </a>{" "}
                      <span className="text-muted-foreground line-clamp-1">
                        {r.equation}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        )}

        {results.literature.length > 0 && (
          <Card className="space-y-2 p-4">
            <h4 className="text-xs font-semibold tracking-wide uppercase">
              Recent literature
            </h4>
            <ul className="space-y-2">
              {results.literature.map((l) => (
                <li key={l.pmid} className="text-xs">
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="line-clamp-2 font-medium hover:underline"
                  >
                    {l.title}
                  </a>
                  <div className="text-muted-foreground font-mono text-[10px]">
                    {[l.first_author, l.journal, l.year]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {results.diagnostics && (
          <Card className="space-y-1 p-4">
            <h4 className="text-xs font-semibold tracking-wide uppercase">
              Source diagnostics
            </h4>
            <ul className="text-muted-foreground space-y-0.5 font-mono text-[11px]">
              {Object.entries(results.diagnostics).map(([k, v]) => {
                const obj = v as { ok: boolean; count?: number; reactions?: number; error?: string };
                return (
                  <li key={k} className="flex items-center justify-between gap-2">
                    <span className="capitalize">{k}</span>
                    <span
                      className={cn(
                        obj.ok ? "text-accent" : "text-destructive",
                      )}
                    >
                      {obj.ok
                        ? `${obj.count ?? obj.reactions ?? 0} ok`
                        : "error"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </aside>
    </div>
  );
}

function SortHeader({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <th
      className={cn(
        "cursor-pointer px-3 py-2 text-left transition-colors",
        active && "text-foreground",
      )}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown className="size-3 opacity-50" />
      </span>
    </th>
  );
}
