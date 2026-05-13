"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Database,
  ExternalLink,
  FileDown,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScoreBlock, MutationChips } from "./primitives";
import { SequencePreview } from "./sequence-preview";
import type { Mutation } from "@/lib/types/database";

export interface CompareCandidate {
  id: string;
  name: string;
  source: "db" | "generated";
  ec_number: string | null;
  organism: string | null;
  source_id: string | null;
  parent_id: string | null;
  parent_name: string | null;
  sequence: string;
  mutations: Mutation[];
  prediction: {
    model_version: string;
    activity_score: number;
    stability_score: number;
    expression_score: number;
    predicted_yield: number;
    confidence_lower: number;
    confidence_upper: number;
  } | null;
}

interface Props {
  projectId: string;
  candidates: CompareCandidate[];
  /** Inline notice rendered above the grid (e.g., "1 candidate could not be loaded"). */
  notice?: string;
}

const TIE_TOLERANCE = 0.01;

export function CandidateCompare({ projectId, candidates, notice }: Props) {
  const n = candidates.length;

  // Winners: any candidate within TIE_TOLERANCE of the top predicted_yield.
  const scored = candidates.filter(
    (c): c is CompareCandidate & { prediction: NonNullable<CompareCandidate["prediction"]> } =>
      c.prediction !== null,
  );
  const maxYield = scored.reduce(
    (m, c) => Math.max(m, c.prediction.predicted_yield),
    -Infinity,
  );
  const winnerIds = new Set(
    scored
      .filter((c) => Math.abs(c.prediction.predicted_yield - maxYield) <= TIE_TOLERANCE)
      .map((c) => c.id),
  );

  // Rank by predicted_yield (descending). Candidates without predictions sort last.
  const sortedByYield = [...candidates].sort(
    (a, b) =>
      (b.prediction?.predicted_yield ?? -Infinity) -
      (a.prediction?.predicted_yield ?? -Infinity),
  );
  const rankById = new Map(sortedByYield.map((c, i) => [c.id, i + 1]));

  // Grid columns scale with N. Below lg we stack vertically.
  const xlColsClass =
    n === 2
      ? "xl:grid-cols-2"
      : n === 3
        ? "xl:grid-cols-3"
        : n === 4
          ? "xl:grid-cols-4"
          : n >= 5
            ? "xl:grid-cols-5"
            : "";

  function exportCSV() {
    const cols = [
      "name",
      "source",
      "ec_number",
      "organism",
      "n_mutations",
      "mutations",
      "activity_score",
      "stability_score",
      "expression_score",
      "predicted_yield",
      "confidence_lower",
      "confidence_upper",
      "model_version",
      "sequence_length",
    ];
    const escape = (v: string) =>
      /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    const rows = [cols.join(",")];
    for (const c of candidates) {
      const p = c.prediction;
      const muts = c.mutations
        .map((m) => `${m.from}${m.position}${m.to}`)
        .join(";");
      const cells: (string | number | null)[] = [
        c.name,
        c.source,
        c.ec_number ?? "",
        c.organism ?? "",
        c.mutations.length,
        muts,
        p?.activity_score ?? "",
        p?.stability_score ?? "",
        p?.expression_score ?? "",
        p?.predicted_yield ?? "",
        p?.confidence_lower ?? "",
        p?.confidence_upper ?? "",
        p?.model_version ?? "",
        c.sequence.length,
      ];
      rows.push(cells.map((x) => (x == null ? "" : escape(String(x)))).join(","));
    }
    const blob = new Blob([rows.join("\n") + "\n"], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `enzymeforge_comparison_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <Link
          href={`/projects/${projectId}/discover`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back to ranked list
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
              Compare
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Comparing {n} candidate{n === 1 ? "" : "s"}
            </h1>
            <p className="text-muted-foreground text-sm">
              Side-by-side activity, stability, expression, yield, mutations,
              and sequence preview. Ranked within this set by predicted yield.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <FileDown className="size-3.5" />
            Export CSV
          </Button>
        </div>
      </header>

      {notice && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-3 text-xs">
          {notice}
        </Card>
      )}

      <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-2", xlColsClass)}>
        {candidates.map((c) => (
          <CompareColumn
            key={c.id}
            projectId={projectId}
            candidate={c}
            isWinner={winnerIds.has(c.id)}
            rank={rankById.get(c.id) ?? null}
            total={n}
          />
        ))}
      </div>
    </div>
  );
}

function CompareColumn({
  projectId,
  candidate,
  isWinner,
  rank,
  total,
}: {
  projectId: string;
  candidate: CompareCandidate;
  isWinner: boolean;
  rank: number | null;
  total: number;
}) {
  const c = candidate;
  const p = c.prediction;
  const highlightPositions = c.mutations.map((m) => m.position);
  return (
    <Card
      className={cn(
        "flex flex-col gap-4 p-4 transition-colors",
        isWinner && "border-accent/60 bg-accent/[0.03]",
      )}
    >
      {/* Header row: source badge + winner badge */}
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px]",
            c.source === "generated" && "bg-accent/10 border-accent/40 text-accent",
          )}
        >
          {c.source === "generated" ? (
            <>
              <Sparkles className="mr-1 size-2.5" /> AI
            </>
          ) : (
            <>
              <Database className="mr-1 size-2.5" /> DB
            </>
          )}
        </Badge>
        {isWinner && (
          <Badge className="bg-accent/15 text-accent border-accent/40 border font-mono text-[10px]">
            <Trophy className="mr-1 size-2.5" />
            Winner
          </Badge>
        )}
      </div>

      {/* Name + parent ref */}
      <div>
        <h2 className="line-clamp-2 text-base font-semibold leading-snug">
          {c.name}
        </h2>
        <p className="text-muted-foreground mt-1 line-clamp-1 font-mono text-[10px]">
          {c.ec_number ? `EC ${c.ec_number}` : null}
          {c.ec_number && c.organism ? " · " : null}
          {c.organism}
        </p>
        {c.source === "generated" && c.parent_name && (
          <p className="text-muted-foreground mt-1 text-xs">
            variant of <span className="font-medium">{c.parent_name}</span>
          </p>
        )}
      </div>

      {/* Mutations */}
      <div>
        <h3 className="text-muted-foreground text-[10px] tracking-wider uppercase">
          Mutations
        </h3>
        {c.mutations.length === 0 ? (
          <p className="text-muted-foreground mt-1 text-xs italic">
            None (database-sourced wild-type)
          </p>
        ) : (
          <MutationChips mutations={c.mutations} className="mt-1.5" />
        )}
      </div>

      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        {p === null ? (
          <p className="text-muted-foreground col-span-2 text-xs italic">
            No prediction yet — open the discovery workflow and run scoring.
          </p>
        ) : (
          <>
            <ScoreBlock label="Activity" value={p.activity_score} />
            <ScoreBlock label="Stability" value={p.stability_score} />
            <ScoreBlock label="Expression" value={p.expression_score} />
            <ScoreBlock
              label="Yield"
              value={p.predicted_yield}
              ci={[p.confidence_lower, p.confidence_upper]}
              highlight
            />
          </>
        )}
      </div>

      {/* Rank */}
      {rank !== null && p !== null && (
        <div className="text-muted-foreground text-xs">
          Ranked{" "}
          <span className="text-foreground font-mono font-semibold">
            #{rank}
          </span>{" "}
          of {total} by predicted yield
        </div>
      )}

      {/* Sequence preview */}
      <div>
        <h3 className="text-muted-foreground text-[10px] tracking-wider uppercase">
          Sequence
          <span className="ml-2 normal-case">
            <span className="font-mono">{c.sequence.length} aa</span>
          </span>
        </h3>
        <div className="mt-2">
          <SequencePreview
            sequence={c.sequence}
            highlight={highlightPositions}
            previewLength={80}
          />
        </div>
      </div>

      {/* Footer link */}
      <div className="border-border/40 mt-auto border-t pt-3">
        <Link
          href={`/projects/${projectId}/candidates/${c.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent inline-flex items-center gap-1 text-xs font-medium hover:underline"
        >
          View 3D structure &amp; full detail
          <ExternalLink className="size-3" />
        </Link>
      </div>
    </Card>
  );
}
