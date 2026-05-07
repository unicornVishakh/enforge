"use client";

import { Check, Database, Sparkles, ChartScatter, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type DiscoverStepStatus = "locked" | "active" | "complete";

export interface DiscoverStep {
  key: "retrieve" | "generate" | "predict";
  title: string;
  subtitle: string;
  status: DiscoverStepStatus;
}

const ICON: Record<DiscoverStep["key"], React.ComponentType<{ className?: string }>> = {
  retrieve: Database,
  generate: Sparkles,
  predict: ChartScatter,
};

export function DiscoverStepper({
  steps,
  currentKey,
  onSelect,
}: {
  steps: DiscoverStep[];
  currentKey: DiscoverStep["key"];
  onSelect?: (k: DiscoverStep["key"]) => void;
}) {
  return (
    <ol className="grid grid-cols-3 gap-3">
      {steps.map((step, i) => {
        const Icon = ICON[step.key];
        const isCurrent = step.key === currentKey;
        const clickable = step.status !== "locked" && onSelect;
        return (
          <li key={step.key}>
            <button
              type="button"
              onClick={clickable ? () => onSelect!(step.key) : undefined}
              disabled={step.status === "locked"}
              className={cn(
                "group relative w-full rounded-xl border p-4 text-left transition-colors",
                isCurrent
                  ? "border-accent/60 bg-accent/5"
                  : step.status === "complete"
                    ? "border-border/60 bg-card/40 hover:border-accent/40"
                    : "border-border/40 bg-muted/20 cursor-not-allowed",
                step.status === "locked" && "opacity-60",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md",
                    step.status === "complete"
                      ? "bg-accent/20 text-accent"
                      : isCurrent
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.status === "complete" ? (
                    <Check className="size-4" />
                  ) : step.status === "locked" ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-muted-foreground font-mono text-[10px] tracking-wider uppercase">
                    Step {i + 1}
                  </div>
                  <div className="truncate text-sm font-semibold">
                    {step.title}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">
                    {step.subtitle}
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
