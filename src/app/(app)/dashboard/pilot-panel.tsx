"use client";

import { useState } from "react";
import { X } from "lucide-react";

const PILOT_MAILTO =
  "mailto:pilot@enzymeforge.lab" +
  "?subject=" +
  encodeURIComponent("Pilot conversation — EnzymeForge") +
  "&body=" +
  encodeURIComponent(
    "Hello,\n\n" +
      "We'd like to discuss a pilot for [target reaction / business unit]. " +
      "Available windows:\n\n",
  );

export function PilotPanel() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    document.cookie =
      "enzymeforge_pilot_panel_dismissed=1; max-age=31536000; path=/; SameSite=Lax";
    setHidden(true);
  }

  return (
    <section className="border-border/80 bg-card relative overflow-hidden rounded-lg border">
      <div className="bg-highlight h-[3px] w-full" aria-hidden />
      <div className="relative grid gap-6 p-7 md:grid-cols-[1.4fr_1fr] md:p-8">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss pilot panel"
          className="text-muted-foreground hover:text-foreground absolute right-3 top-3 inline-flex size-7 items-center justify-center rounded-md"
        >
          <X className="size-4" />
        </button>
        <div>
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
            <span className="bg-highlight inline-block h-[3px] w-7" />
            <span>Programme · Active</span>
          </div>
          <h2 className="font-display text-foreground mt-3 text-[1.5rem] font-semibold tracking-[-0.018em]">
            Built around the GPS Renewables ethanol-to-jet programme.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl leading-relaxed">
            EnzymeForge is designed to compress an ethanol-to-jet catalyst
            pipeline from months to days. A 90-day pilot opens with a
            sandboxed deployment, one target reaction from the programme
            roadmap, weekly review, and a single success criterion:
            time-to-first-viable-candidate.
          </p>
          <a
            href={PILOT_MAILTO}
            className="text-accent mt-5 inline-flex items-center gap-1 text-sm font-medium hover:underline underline-offset-4"
          >
            Schedule a pilot conversation →
          </a>
        </div>
        <div className="border-border/70 bg-background/60 grid grid-cols-2 divide-x divide-border/70 self-start rounded-md border">
          {[
            { v: "90 d", l: "pilot window" },
            { v: "1", l: "target reaction" },
            { v: "weekly", l: "review cadence" },
            { v: "TTFVC", l: "success metric" },
          ].map((s) => (
            <div key={s.l} className="px-4 py-4">
              <div className="font-mono text-[18px] font-medium tabular-nums">
                {s.v}
              </div>
              <div className="text-muted-foreground mt-1 text-[11px] tracking-wide uppercase">
                {s.l}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
