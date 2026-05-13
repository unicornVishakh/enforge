"use client";

import { useState } from "react";
import { X } from "lucide-react";

const PILOT_MAILTO =
  "mailto:pilot@enzymeforge.ai" +
  "?subject=" +
  encodeURIComponent("Pilot conversation — EnzymeForge.ai") +
  "&body=" +
  encodeURIComponent(
    "Hi EnzymeForge team,\n\n" +
      "We'd like to discuss a pilot for [target reaction / business unit]. " +
      "Available windows:\n\n" +
      "— [Name], GPS Renewables",
  );

/**
 * Renders the pilot pitch panel. The parent server component should only
 * mount this when the dismissal cookie is absent; this component handles
 * its own optimistic hide + cookie write on the X click.
 *
 * Cookie: enzymeforge_pilot_panel_dismissed=1; max-age=1y; path=/; SameSite=Lax
 * Not httpOnly — this is a UI preference, intentionally JS-readable.
 */
export function PilotPanel() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    document.cookie =
      "enzymeforge_pilot_panel_dismissed=1; max-age=31536000; path=/; SameSite=Lax";
    setHidden(true);
  }

  return (
    <section className="border-accent/40 bg-accent/[0.04] relative rounded-xl border p-5 pr-12">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss pilot panel"
        className="text-muted-foreground hover:text-foreground absolute top-3 right-3 transition-colors"
      >
        <X className="size-4" />
      </button>
      <h2 className="text-base font-semibold tracking-tight">
        Building this for GPS Renewables.
      </h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        EnzymeForge is designed to compress your ethanol-to-jet catalyst
        pipeline from months to days. We&apos;re proposing a 90-day pilot:
        sandboxed deployment, one target reaction from your roadmap, weekly
        review with your R&amp;D lead, success measured in
        time-to-first-viable-candidate.
      </p>
      <a
        href={PILOT_MAILTO}
        className="text-accent mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
      >
        Schedule a pilot conversation →
      </a>
    </section>
  );
}
