"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  ChartScatter,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Loader2,
  Sparkles,
  Database,
  GitCompare,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ActivityStabilityScatter,
  type ScatterPoint,
} from "@/components/visualizations/scatter-chart";
import { cn } from "@/lib/utils";

const MAX_COMPARE = 5;

export interface PredictableCandidate {
  id: string;
  name: string;
  source: "db" | "generated";
  organism: string | null;
  ec_number: string | null;
  parent_name: string | null;
  source_id: string | null;
}

export interface PredictionRow {
  candidate_id: string;
  model_version: string;
  activity_score: number;
  stability_score: number;
  expression_score: number;
  predicted_yield: number;
  confidence_lower: number;
  confidence_upper: number;
}

interface Props {
  projectId: string;
  candidates: PredictableCandidate[];
  initialPredictions: PredictionRow[];
}

type SortKey =
  | "name"
  | "yield"
  | "activity"
  | "stability"
  | "expression";

export function PredictStep({
  projectId,
  candidates,
  initialPredictions,
}: Props) {
  const [predictions, setPredictions] = useState<PredictionRow[]>(initialPredictions);
  const [pending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey>("yield");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      if (next.size >= MAX_COMPARE) {
        toast.warning(
          `Maximum ${MAX_COMPARE} candidates per comparison — uncheck one to add another.`,
        );
        return prev;
      }
      next.add(id);
      return next;
    });
  }

  function clearSelected() {
    setSelectedIds(new Set());
  }

  const selectedCount = selectedIds.size;
  const canCompare = selectedCount >= 2 && selectedCount <= MAX_COMPARE;
  const compareHref = `/projects/${projectId}/compare?ids=${Array.from(
    selectedIds,
  ).join(",")}`;

  function runPredict() {
    if (candidates.length === 0) {
      toast.error("No candidates to predict yet.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { predictions: PredictionRow[]; n: number };
        setPredictions(data.predictions);
        toast.success(
          `Scored ${data.n} candidate${data.n === 1 ? "" : "s"}`,
        );
      } catch (e) {
        toast.error(`Prediction failed: ${(e as Error).message}`);
      }
    });
  }

  const byCandidate = new Map<string, PredictionRow>();
  for (const p of predictions) byCandidate.set(p.candidate_id, p);

  const rows = candidates
    .map((c) => ({ candidate: c, prediction: byCandidate.get(c.id) }))
    .filter((r) => r.prediction)
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "name":
          return dir * a.candidate.name.localeCompare(b.candidate.name);
        case "yield":
          return dir * (a.prediction!.predicted_yield - b.prediction!.predicted_yield);
        case "activity":
          return dir * (a.prediction!.activity_score - b.prediction!.activity_score);
        case "stability":
          return dir * (a.prediction!.stability_score - b.prediction!.stability_score);
        case "expression":
          return dir * (a.prediction!.expression_score - b.prediction!.expression_score);
      }
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const scatterData: ScatterPoint[] = rows.map((r) => ({
    id: r.candidate.id,
    name: r.candidate.name,
    x: r.prediction!.activity_score,
    y: r.prediction!.stability_score,
    z: r.prediction!.predicted_yield,
    source: r.candidate.source,
    ec_number: r.candidate.ec_number,
    organism: r.candidate.organism,
    predicted_yield: r.prediction!.predicted_yield,
    confidence_lower: r.prediction!.confidence_lower,
    confidence_upper: r.prediction!.confidence_upper,
    selected: highlightedId === r.candidate.id,
  }));

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Step 3 — Predict & rank</h2>
            <p className="text-muted-foreground text-xs">
              Activity, stability, expression, predicted yield with 95% CIs.
              Deterministic given (sequence, model_version).
            </p>
          </div>
          <Button size="sm" onClick={runPredict} disabled={pending || candidates.length === 0}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Scoring…
              </>
            ) : (
              <>
                <ChartScatter />
                {predictions.length > 0
                  ? `Re-score ${candidates.length}`
                  : `Score ${candidates.length} candidate${candidates.length === 1 ? "" : "s"}`}
              </>
            )}
          </Button>
        </header>

        {predictions.length === 0 ? (
          <div className="border-border/60 rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No predictions yet. Run scoring to populate the ranked table and
              activity-vs-stability scatter.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
            {predictions[0]?.model_version} · {predictions.length} predictions
          </p>
        )}
      </Card>

      {predictions.length > 0 && (
        <Card className="p-5">
          <header className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Activity vs stability</h3>
            <p className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
              Dot size = predicted yield · Hover to inspect
            </p>
          </header>
          <ActivityStabilityScatter
            data={scatterData}
            onPointClick={(id) => setHighlightedId(id)}
          />
          <div className="text-muted-foreground mt-2 flex items-center gap-4 text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-chart-1 inline-block size-2 rounded-full" />
              DB-sourced
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="bg-accent inline-block size-2 rounded-full" />
              AI-generated
            </span>
          </div>
        </Card>
      )}

      {predictions.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-border/40 border-b p-4">
            <h3 className="text-sm font-semibold">Ranked candidates</h3>
            <p className="text-muted-foreground text-[11px]">
              Click a column to sort. Tick rows to compare. Candidate names
              open in a new tab so your selection survives.
            </p>
          </div>

          <div className="border-border/40 bg-muted/20 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground font-mono text-[11px] tracking-wide">
                <span className="text-foreground font-semibold">
                  {selectedCount}
                </span>{" "}
                selected
              </span>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={clearSelected}
                  className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 hover:underline"
                >
                  Clear
                </button>
              )}
              {selectedCount === MAX_COMPARE && (
                <span className="text-amber-600 dark:text-amber-400 text-[11px]">
                  Max {MAX_COMPARE} reached.
                </span>
              )}
            </div>
            {canCompare ? (
              <Link
                href={compareHref}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                <GitCompare className="size-3.5" />
                Compare selected
              </Link>
            ) : (
              <span
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "pointer-events-none opacity-50",
                )}
                aria-disabled
              >
                <GitCompare className="size-3.5" />
                {selectedCount < 2
                  ? "Select 2+ to compare"
                  : "Compare selected"}
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground bg-muted/30 text-[11px] tracking-wider uppercase">
                <tr>
                  <th className="w-8 px-3 py-2">
                    <span className="sr-only">Select</span>
                  </th>
                  <SortHeader keyName="name" current={sortKey} dir={sortDir} onClick={toggleSort}>
                    Candidate
                  </SortHeader>
                  <th className="px-3 py-2 text-left">Source</th>
                  <SortHeader
                    keyName="activity"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  >
                    Activity
                  </SortHeader>
                  <SortHeader
                    keyName="stability"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  >
                    Stability
                  </SortHeader>
                  <SortHeader
                    keyName="expression"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  >
                    Expression
                  </SortHeader>
                  <SortHeader
                    keyName="yield"
                    current={sortKey}
                    dir={sortDir}
                    onClick={toggleSort}
                    align="left"
                  >
                    Yield (CI)
                  </SortHeader>
                  <th className="px-3 py-2 text-right" />
                </tr>
              </thead>
              <tbody className="divide-border/40 divide-y">
                {rows.map(({ candidate: c, prediction: p }) => (
                  <tr
                    key={c.id}
                    onMouseEnter={() => setHighlightedId(c.id)}
                    onMouseLeave={() => setHighlightedId(null)}
                    className={cn(
                      "transition-colors",
                      selectedIds.has(c.id)
                        ? "bg-accent/[0.06]"
                        : highlightedId === c.id
                          ? "bg-accent/10"
                          : "hover:bg-muted/20",
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelected(c.id)}
                        aria-label={`Select ${c.name} for compare`}
                        className="border-border accent-accent size-3.5 cursor-pointer rounded-sm border"
                      />
                    </td>
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/projects/${projectId}/candidates/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                      <div className="text-muted-foreground line-clamp-1 font-mono text-[10px]">
                        {c.ec_number ? `EC ${c.ec_number} · ` : ""}
                        {c.organism ?? c.parent_name ?? ""}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-[10px]",
                          c.source === "generated" &&
                            "bg-accent/10 border-accent/40 text-accent",
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
                    </td>
                    <td className="px-3 py-2.5">
                      <ScoreBar value={p!.activity_score} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ScoreBar value={p!.stability_score} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ScoreBar value={p!.expression_score} />
                    </td>
                    <td className="px-3 py-2.5">
                      <YieldCell prediction={p!} />
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <Link
                        href={`/projects/${projectId}/candidates/${c.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent transition-colors"
                      >
                        <ExternalLink className="inline-block size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="w-28">
      <Progress value={pct} className="h-1.5" />
      <span className="text-muted-foreground mt-0.5 inline-block font-mono text-[10px]">
        {value.toFixed(3)}
      </span>
    </div>
  );
}

function YieldCell({ prediction }: { prediction: PredictionRow }) {
  const pct = Math.round(prediction.predicted_yield * 100);
  return (
    <div className="w-32">
      <div className="bg-muted relative h-3 overflow-hidden rounded-sm">
        <div
          className="bg-accent/30 absolute top-0 bottom-0"
          style={{
            left: `${prediction.confidence_lower * 100}%`,
            right: `${(1 - prediction.confidence_upper) * 100}%`,
          }}
        />
        <div
          className="bg-accent absolute top-0 bottom-0 w-[2px]"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground mt-0.5 inline-block font-mono text-[10px]">
        {prediction.predicted_yield.toFixed(3)}{" "}
        <span className="opacity-60">
          [{prediction.confidence_lower.toFixed(2)}–
          {prediction.confidence_upper.toFixed(2)}]
        </span>
      </span>
    </div>
  );
}

function SortHeader({
  keyName,
  current,
  dir,
  onClick,
  children,
  align = "left",
}: {
  keyName: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  const active = current === keyName;
  return (
    <th
      className={cn(
        "cursor-pointer px-3 py-2 transition-colors",
        align === "right" ? "text-right" : "text-left",
        active && "text-foreground",
      )}
      onClick={() => onClick(keyName)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (dir === "asc" ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)}
      </span>
    </th>
  );
}
