"use client";

import { useState, useTransition } from "react";
import {
  Info,
  Loader2,
  Sparkles,
  ChartScatter,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Mutation } from "@/lib/types/database";

export interface ParentCandidate {
  id: string;
  name: string;
  organism: string | null;
  ec_number: string | null;
  sequence: string;
  length: number;
  source_id: string | null;
}

export interface GeneratedVariant {
  id: string;
  name: string;
  parent_id: string;
  parent_name?: string;
  parent_sequence?: string;
  sequence?: string;
  mutations: Mutation[];
  proposal_score: number;
  length: number;
}

interface Props {
  projectId: string;
  parents: ParentCandidate[];
  initialVariants: GeneratedVariant[];
  onAdvance?: () => void;
}

export function GenerateStep({
  projectId,
  parents,
  initialVariants,
  onAdvance,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(parents.slice(0, Math.min(2, parents.length)).map((p) => p.id)),
  );
  const [variants, setVariants] = useState<GeneratedVariant[]>(initialVariants);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else if (next.size < 5) next.add(id);
      else toast.warning("Pick up to 5 parents per generation run.");
      return next;
    });
  }

  function runGenerate() {
    if (selected.size === 0) {
      toast.error("Select at least one parent candidate.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            parentCandidateIds: Array.from(selected),
            nVariantsPerParent: 8,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          ok: boolean;
          variants: GeneratedVariant[];
          errors: { parent_id: string; error: string }[];
          n_total: number;
        };
        // Hydrate parent_name + parent_sequence from local list
        const hydrated = data.variants.map((v) => {
          const parent = parents.find((p) => p.id === v.parent_id);
          return {
            ...v,
            parent_name: parent?.name,
            parent_sequence: parent?.sequence,
          };
        });
        setVariants((cur) => [...cur, ...hydrated]);
        if (data.errors.length > 0) {
          toast.warning(
            `Generated ${data.n_total} variants, ${data.errors.length} parents errored. Check HF API key.`,
          );
        } else {
          toast.success(`Generated ${data.n_total} variants from ${selected.size} parent(s).`);
        }
      } catch (e) {
        toast.error(`Generation failed: ${(e as Error).message}`);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-4 p-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold">
              Step 2 — Generate variants
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Info className="size-3.5" />
                    </button>
                  }
                />
                <TooltipContent className="max-w-xs">
                  Variants proposed using ESM-2 masked-LM scoring. Production
                  deployment would integrate ProteinMPNN and structure-based
                  scoring. Labelled &quot;demo-grade&quot; in exports.
                </TooltipContent>
              </Tooltip>
            </h2>
            <p className="text-muted-foreground text-xs">
              Pick up to 5 parents. We probe ~20 positions per parent and
              return up to 8 multi-mutation candidates.
            </p>
          </div>
          <Button size="sm" onClick={runGenerate} disabled={pending || selected.size === 0}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles />
                Generate from {selected.size} parent
                {selected.size === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </header>

        {parents.length === 0 ? (
          <div className="border-border/60 rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No DB-sourced candidates yet. Run Step 1 (Retrieve) first.
            </p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {parents.map((p) => {
              const isSelected = selected.has(p.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "group w-full rounded-lg border p-3 text-left transition-colors",
                      isSelected
                        ? "border-accent/60 bg-accent/5"
                        : "border-border/60 bg-card/40 hover:border-accent/40 hover:bg-card",
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={cn(
                          "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "bg-accent border-accent text-accent-foreground"
                            : "border-border",
                        )}
                      >
                        {isSelected && <span className="text-[10px]">✓</span>}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-medium">
                          {p.name}
                        </div>
                        <div className="text-muted-foreground line-clamp-1 font-mono text-[10px] tracking-wide">
                          {p.organism ?? "Unknown"}
                          {p.ec_number ? ` · EC ${p.ec_number}` : ""}{" "}
                          · {p.length}aa
                        </div>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">
              Generated variants{" "}
              <span className="text-muted-foreground ml-1 font-mono text-xs">
                {variants.length}
              </span>
            </h3>
            <p className="text-muted-foreground text-[11px]">
              Click a row to expand and inspect the sequence diff.
            </p>
          </div>
          {variants.length > 0 && onAdvance && (
            <Button size="sm" variant="outline" onClick={onAdvance}>
              Continue
              <ChartScatter className="size-3.5" />
            </Button>
          )}
        </header>

        {pending && variants.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : variants.length === 0 ? (
          <div className="border-border/60 rounded-lg border border-dashed p-6 text-center">
            <p className="text-muted-foreground text-sm">
              No variants yet. Pick parents above and run generation.
            </p>
          </div>
        ) : (
          <ul className="divide-border/40 divide-y">
            {variants.map((v) => (
              <VariantRow key={v.id} variant={v} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function VariantRow({ variant }: { variant: GeneratedVariant }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="hover:bg-muted/30 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
      >
        {open ? (
          <ChevronDown className="text-muted-foreground size-3.5" />
        ) : (
          <ChevronRight className="text-muted-foreground size-3.5" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm">{variant.name}</div>
          <div className="text-muted-foreground line-clamp-1 text-[11px]">
            from{" "}
            <span className="text-foreground">
              {variant.parent_name ?? "parent"}
            </span>{" "}
            · {variant.length}aa · score{" "}
            {variant.proposal_score.toFixed(3)}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {variant.mutations.map((m, i) => (
            <Badge
              key={i}
              variant="outline"
              className="bg-accent/10 border-accent/40 text-accent font-mono text-[10px]"
            >
              {m.from}
              {m.position}
              {m.to}
            </Badge>
          ))}
        </div>
      </button>
      {open && variant.parent_sequence && variant.sequence && (
        <div className="bg-muted/20 border-border/40 border-t px-3 py-3">
          <SequenceDiff
            parent={variant.parent_sequence}
            variant={variant.sequence}
            mutations={variant.mutations}
          />
        </div>
      )}
    </li>
  );
}

function SequenceDiff({
  parent,
  variant,
  mutations,
}: {
  parent: string;
  variant: string;
  mutations: Mutation[];
}) {
  const mutPositions = new Set(mutations.map((m) => m.position - 1));
  const lineWidth = 60;
  const lines: { offset: number; parent: string; variant: string }[] = [];
  for (let i = 0; i < parent.length; i += lineWidth) {
    lines.push({
      offset: i,
      parent: parent.slice(i, i + lineWidth),
      variant: variant.slice(i, i + lineWidth),
    });
  }
  return (
    <div className="space-y-2 font-mono text-[11px]">
      {lines.map((line) => (
        <div key={line.offset} className="grid grid-cols-[3rem_1fr] gap-2">
          <span className="text-muted-foreground text-right">
            {line.offset + 1}
          </span>
          <div className="space-y-0.5 leading-tight">
            <div>
              {Array.from(line.parent).map((aa, idx) => {
                const pos = line.offset + idx;
                const isMut = mutPositions.has(pos);
                return (
                  <span
                    key={idx}
                    className={cn(
                      isMut && "bg-destructive/30 text-destructive-foreground",
                    )}
                  >
                    {aa}
                  </span>
                );
              })}
              <span className="text-muted-foreground/50 ml-2">parent</span>
            </div>
            <div>
              {Array.from(line.variant).map((aa, idx) => {
                const pos = line.offset + idx;
                const isMut = mutPositions.has(pos);
                return (
                  <span
                    key={idx}
                    className={cn(
                      isMut && "bg-accent/30 text-accent",
                    )}
                  >
                    {aa}
                  </span>
                );
              })}
              <span className="text-muted-foreground/50 ml-2">variant</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
