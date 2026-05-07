"use client";

import { useState, useTransition } from "react";
import { Beaker, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CandidateRow {
  id: string;
  name: string;
  organism: string | null;
  ec_number: string | null;
}

interface ExperimentRow {
  id: string;
  candidate_id: string;
  performed_at: string;
  measured_activity: number | null;
  measured_stability: number | null;
  measured_yield: number | null;
  notes: string | null;
  candidate_name?: string;
  predicted_activity?: number;
  predicted_stability?: number;
  predicted_yield?: number;
  model_version?: string;
}

interface Props {
  candidates: CandidateRow[];
  initial: ExperimentRow[];
}

export function ExperimentsClient({ candidates, initial }: Props) {
  const [experiments, setExperiments] = useState<ExperimentRow[]>(initial);
  const [pending, startTransition] = useTransition();
  const [retraining, startRetrain] = useTransition();
  const [retrainResult, setRetrainResult] = useState<{
    model_version: string;
    n: number;
    mae: { activity: number | null; stability: number | null; yield: number | null };
    hypotheses: { detail: string; weight: number }[];
  } | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      try {
        const res = await fetch("/api/experiments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate_id: formData.get("candidate_id"),
            measured_activity: formData.get("measured_activity") || null,
            measured_stability: formData.get("measured_stability") || null,
            measured_yield: formData.get("measured_yield") || null,
            notes: formData.get("notes") || null,
          }),
        });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        const cand = candidates.find((c) => c.id === j.experiment.candidate_id);
        setExperiments((cur) => [
          {
            ...j.experiment,
            candidate_name: cand?.name,
          },
          ...cur,
        ]);
        toast.success("Experiment logged");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function retrain() {
    startRetrain(async () => {
      try {
        const res = await fetch("/api/retrain", { method: "POST" });
        const j = await res.json();
        if (!res.ok || !j.ok) throw new Error(j.error ?? `HTTP ${res.status}`);
        setRetrainResult({
          model_version: j.model_version,
          n: j.n,
          mae: j.mae,
          hypotheses: j.hypotheses ?? [],
        });
        toast.success(`Retrained → model_version ${j.model_version}`);
      } catch (e) {
        toast.error(`Retrain failed: ${(e as Error).message}`);
      }
    });
  }

  const calibrationPoints = experiments
    .filter(
      (e) =>
        typeof e.predicted_yield === "number" && typeof e.measured_yield === "number",
    )
    .map((e) => ({
      x: e.predicted_yield!,
      y: e.measured_yield!,
      candidate: e.candidate_name ?? "",
    }));

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Log a new experiment</h2>
            <p className="text-muted-foreground text-xs">
              Measured values are in [0,1] (normalize before entering).
            </p>
          </div>
        </header>
        <form action={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="candidate_id" className="text-xs">
              Candidate
            </Label>
            <Select name="candidate_id" required>
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select a candidate" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                    {c.ec_number ? ` (EC ${c.ec_number})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="measured_activity" className="text-xs">
              Measured activity
            </Label>
            <Input
              id="measured_activity"
              name="measured_activity"
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="0.72"
            />
          </div>
          <div>
            <Label htmlFor="measured_stability" className="text-xs">
              Measured stability
            </Label>
            <Input
              id="measured_stability"
              name="measured_stability"
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="0.65"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="measured_yield" className="text-xs">
              Measured yield
            </Label>
            <Input
              id="measured_yield"
              name="measured_yield"
              type="number"
              min="0"
              max="1"
              step="0.01"
              placeholder="0.55"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="notes" className="text-xs">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Conditions, deviations, anything you want preserved with this measurement."
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              <Beaker />
              {pending ? "Saving…" : "Log experiment"}
            </Button>
          </div>
        </form>
      </Card>

      {experiments.length >= 2 && calibrationPoints.length > 0 && (
        <Card className="space-y-3 p-5">
          <header className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold">Calibration</h2>
              <p className="text-muted-foreground text-xs">
                Predicted vs measured yield. y = x is perfect calibration.
              </p>
            </div>
            <Button size="sm" onClick={retrain} disabled={retraining}>
              <RefreshCw className={cn("size-3.5", retraining && "animate-spin")} />
              {retraining ? "Retraining…" : "Retrain calibration"}
            </Button>
          </header>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 12, bottom: 24, left: 4 }}>
                <CartesianGrid stroke="oklch(0.27 0 0)" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  stroke="oklch(0.708 0 0)"
                  label={{
                    value: "Predicted yield",
                    position: "insideBottom",
                    offset: -8,
                    fill: "oklch(0.708 0 0)",
                    fontSize: 10,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  stroke="oklch(0.708 0 0)"
                  label={{
                    value: "Measured yield",
                    angle: -90,
                    position: "insideLeft",
                    fill: "oklch(0.708 0 0)",
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  segment={[
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                  ]}
                  stroke="oklch(0.65 0.18 152 / 0.6)"
                  strokeDasharray="4 4"
                />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || !payload[0]) return null;
                    const p = payload[0].payload as {
                      x: number;
                      y: number;
                      candidate: string;
                    };
                    return (
                      <div className="border-border/60 bg-card rounded-md border p-2 text-xs">
                        <div className="line-clamp-1 font-medium">{p.candidate}</div>
                        <div className="text-muted-foreground font-mono text-[10px]">
                          predicted {p.x.toFixed(3)} · measured {p.y.toFixed(3)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Scatter data={calibrationPoints} fill="oklch(0.65 0.18 152)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          {retrainResult && (
            <div className="border-border/40 grid gap-2 rounded-md border p-3 text-xs sm:grid-cols-3">
              <Stat
                label="Model version"
                value={retrainResult.model_version}
                mono
              />
              <Stat
                label="Observations"
                value={String(retrainResult.n)}
                mono
              />
              <Stat
                label="MAE (yield)"
                value={
                  retrainResult.mae.yield !== null
                    ? retrainResult.mae.yield.toFixed(3)
                    : "—"
                }
                mono
              />
            </div>
          )}
          {retrainResult && retrainResult.hypotheses.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wide uppercase">
                Hypotheses surfaced
              </h4>
              <ul className="space-y-1.5 text-xs">
                {retrainResult.hypotheses.map((h, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-2">
                    <TrendingDown className="text-destructive mt-0.5 size-3 shrink-0" />
                    <span>{h.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-border/40 border-b p-4">
          <h3 className="text-sm font-semibold">All experiments</h3>
          <p className="text-muted-foreground text-[11px]">
            Each row is bound to the prediction it was measured against (by
            model_version) — old predictions remain frozen.
          </p>
        </div>
        {experiments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">No experiments logged yet.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground bg-muted/30 text-[11px] tracking-wider uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Candidate</th>
                <th className="px-3 py-2 text-left">Activity (Δ)</th>
                <th className="px-3 py-2 text-left">Stability (Δ)</th>
                <th className="px-3 py-2 text-left">Yield (Δ)</th>
                <th className="px-3 py-2 text-left">Model</th>
              </tr>
            </thead>
            <tbody className="divide-border/40 divide-y">
              {experiments.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="text-muted-foreground px-3 py-2 font-mono text-[10px]">
                    {new Date(e.performed_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">{e.candidate_name ?? e.candidate_id}</td>
                  <td className="px-3 py-2">
                    <DeltaCell measured={e.measured_activity} predicted={e.predicted_activity} />
                  </td>
                  <td className="px-3 py-2">
                    <DeltaCell measured={e.measured_stability} predicted={e.predicted_stability} />
                  </td>
                  <td className="px-3 py-2">
                    <DeltaCell measured={e.measured_yield} predicted={e.predicted_yield} />
                  </td>
                  <td className="px-3 py-2">
                    {e.model_version ? (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {e.model_version}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">{label}</p>
      <p className={"mt-0.5 text-sm " + (mono ? "font-mono" : "font-medium")}>{value}</p>
    </div>
  );
}

function DeltaCell({ measured, predicted }: { measured: number | null; predicted?: number }) {
  if (measured === null) return <span className="text-muted-foreground text-xs">—</span>;
  const delta = predicted !== undefined ? measured - predicted : null;
  return (
    <div className="flex items-center gap-2 font-mono text-xs">
      <span>{measured.toFixed(3)}</span>
      {delta !== null && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[10px]",
            delta >= 0 ? "text-accent" : "text-destructive",
          )}
        >
          {delta >= 0 ? <TrendingUp className="size-2.5" /> : <TrendingDown className="size-2.5" />}
          {delta >= 0 ? "+" : ""}
          {delta.toFixed(3)}
        </span>
      )}
    </div>
  );
}
