/**
 * Shared discovery primitives.
 *
 * - ScoreBlock: lifted verbatim from candidates/[candidateId]/page.tsx (Phase 4)
 *   to enable reuse across the candidate detail page and the compare view.
 * - SequenceBlock: lifted verbatim from same source. Pure prop-driven.
 * - MutationChips: extracted from generate-step.tsx's inline pattern.
 *
 * No "use client" — these are server-safe so the candidate detail (Server
 * Component) can still render ScoreBlock / SequenceBlock without forcing a
 * client boundary. The Progress dep is a Client Component already; that's
 * the correct boundary, not these wrappers.
 */

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Mutation } from "@/lib/types/database";

export function ScoreBlock({
  label,
  value,
  ci,
  highlight,
}: {
  label: string;
  value: number;
  ci?: [number, number];
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
        {label}
      </p>
      <p
        className={
          "mt-0.5 font-mono text-2xl font-semibold tracking-tight " +
          (highlight ? "text-accent" : "")
        }
      >
        {value.toFixed(3)}
      </p>
      <Progress value={Math.round(value * 100)} className="mt-2 h-1.5" />
      {ci && (
        <p className="text-muted-foreground mt-1 font-mono text-[10px]">
          CI {ci[0].toFixed(2)}&ndash;{ci[1].toFixed(2)}
        </p>
      )}
    </div>
  );
}

export function SequenceBlock({
  sequence,
  highlight,
}: {
  sequence: string;
  highlight: number[];
}) {
  const set = new Set(highlight.map((p) => p - 1));
  const lineLen = 60;
  const lines: { offset: number; chars: string }[] = [];
  for (let i = 0; i < sequence.length; i += lineLen) {
    lines.push({ offset: i, chars: sequence.slice(i, i + lineLen) });
  }
  return (
    <div className="font-mono text-[11px] leading-relaxed">
      {lines.map((line) => (
        <div key={line.offset} className="grid grid-cols-[3rem_1fr] gap-2">
          <span className="text-muted-foreground text-right">
            {line.offset + 1}
          </span>
          <div>
            {Array.from(line.chars).map((aa, idx) => {
              const pos = line.offset + idx;
              const hit = set.has(pos);
              return (
                <span
                  key={idx}
                  className={hit ? "bg-accent/30 text-accent" : ""}
                >
                  {aa}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact chip cluster for a list of mutations. Matches the inline pattern
 * used in generate-step.tsx VariantRow. Renders nothing if mutations is empty.
 */
export function MutationChips({
  mutations,
  className,
}: {
  mutations: Mutation[];
  className?: string;
}) {
  if (!mutations || mutations.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {mutations.map((m, i) => (
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
  );
}
