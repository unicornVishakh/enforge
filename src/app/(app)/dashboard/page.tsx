import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PilotPanel } from "./pilot-panel";
import { CalibrationLine, CorpusBars, PredictionsArea } from "./pulse-charts";
import type { Project } from "@/lib/types/database";

export const metadata = { title: "Dashboard · EnzymeForge" };

const ACTIVITY = [
  {
    when: "2 hours ago",
    kind: "Prediction",
    body: "Activity scorer emitted 8 candidates for parent ADH1; CI bands within tolerance.",
  },
  {
    when: "Yesterday",
    kind: "Calibration",
    body: "Calibration head bumped to scoring/1.4.7 — three new bench measurements absorbed.",
  },
  {
    when: "2 days ago",
    kind: "Retrieval",
    body: "Federated query returned 19 catalysts for substrate 2,3-butanediol → ethyl ester.",
  },
  {
    when: "3 days ago",
    kind: "Disclosure",
    body: "Methodology note revised — non-E. coli expression penalty raised from 0.18 to 0.21.",
  },
] as const;

const CAPABILITIES = [
  {
    no: "01",
    title: "Catalyst retrieval",
    body: "Federated UniProt + KEGG + BRENDA queries with full provenance.",
    href: "/articles/retrieving-catalysts",
  },
  {
    no: "02",
    title: "Variant design",
    body: "ESM-2 masked-LM probes; five single- and three double-mutants per parent.",
    href: "/articles/designing-variants-with-esm2",
  },
  {
    no: "03",
    title: "Property scoring",
    body: "Activity, stability, expression, yield — each with a 95% CI.",
    href: "/articles/honest-scoring",
  },
  {
    no: "04",
    title: "Bench recalibration",
    body: "Predictions logged; the scoring head recalibrates against your data.",
    href: "/articles/closed-loop",
  },
] as const;

export default async function DashboardPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const pilotDismissed =
    cookieStore.get("enzymeforge_pilot_panel_dismissed")?.value === "1";
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, name, target_reaction, substrate, product, conditions, created_by, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(6);

  const list = (projects ?? []) as Project[];
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10">
      {/* Masthead */}
      <header className="border-border/80 flex flex-col gap-3 border-b pb-8">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
          <span className="bg-highlight inline-block h-[3px] w-7" />
          <span>Workspace · Dashboard</span>
          <span aria-hidden className="bg-border h-px w-5" />
          <span>{today}</span>
        </div>
        <h1 className="font-display text-foreground text-[2rem] font-semibold leading-tight tracking-[-0.022em] sm:text-[2.3rem]">
          The laboratory, this week.
        </h1>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          A quick read on the programme&rsquo;s pulse, the activity log, and
          the runs you left open. Signed in as{" "}
          <span className="text-foreground font-medium">
            {user?.email ?? "researcher"}
          </span>
          .
        </p>
      </header>

      {!pilotDismissed && <PilotPanel />}

      {/* Pulse — animated charts */}
      <section>
        <SectionHeader
          eyebrow="Programme pulse · Weekly"
          title="Three readouts from the live programme."
          subtitle="Each chart redraws on mount; values come from the prediction log and the weekly calibration job."
        />
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <PredictionsArea />
          <CalibrationLine />
          <CorpusBars />
        </div>
      </section>

      {/* Activity + recent projects */}
      <section className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="border-border/80 bg-card flex flex-col overflow-hidden rounded-lg border">
          <div className="border-border/80 flex items-end justify-between border-b p-5">
            <div>
              <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase">
                <span className="bg-highlight inline-block h-[3px] w-5" />
                <span>Activity log</span>
              </div>
              <h2 className="font-display text-foreground mt-2 text-[1.05rem] font-semibold tracking-[-0.012em]">
                Recent events in this workspace.
              </h2>
            </div>
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              Full log →
            </Link>
          </div>
          <ol className="divide-border/80 flex flex-col divide-y">
            {ACTIVITY.map((a) => (
              <li key={a.when} className="grid grid-cols-[88px_1fr] gap-4 p-5">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.16em] uppercase">
                    {a.kind}
                  </span>
                  <span className="text-foreground/70 font-mono text-[11px]">
                    {a.when}
                  </span>
                </div>
                <p className="text-foreground/85 text-[14px] leading-relaxed">
                  {a.body}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="border-border/80 bg-card flex flex-col overflow-hidden rounded-lg border">
          <div className="border-border/80 flex items-end justify-between border-b p-5">
            <div>
              <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase">
                <span className="bg-highlight inline-block h-[3px] w-5" />
                <span>Recent runs</span>
              </div>
              <h2 className="font-display text-foreground mt-2 text-[1.05rem] font-semibold tracking-[-0.012em]">
                Pick up where you left off.
              </h2>
            </div>
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground text-xs font-medium"
            >
              All runs →
            </Link>
          </div>
          {list.length === 0 ? (
            <div className="flex flex-1 flex-col items-start gap-3 p-6">
              <p className="text-muted-foreground text-sm leading-relaxed">
                No discovery runs in this workspace yet. Open the first to
                start populating the activity log.
              </p>
              <Link
                href="/projects/new"
                className={cn(buttonVariants({ size: "default" }))}
              >
                New discovery run
                <ArrowRight />
              </Link>
            </div>
          ) : (
            <ol className="divide-border/80 flex flex-col divide-y">
              {list.map((p, i) => (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className="group hover:bg-muted/40 grid grid-cols-[44px_1fr_auto] items-center gap-4 px-5 py-4 transition-colors"
                  >
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-foreground group-hover:text-accent line-clamp-1 text-sm font-medium transition-colors">
                        {p.name}
                      </h3>
                      <p className="text-muted-foreground mt-0.5 line-clamp-1 text-[12.5px]">
                        {p.target_reaction ||
                          [p.substrate, p.product].filter(Boolean).join(" → ") ||
                          "No target reaction set"}
                      </p>
                    </div>
                    <span className="text-muted-foreground/80 font-mono text-[10.5px] tabular-nums">
                      {new Date(p.created_at).toLocaleDateString("en-CA")}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* Capability index */}
      <section>
        <SectionHeader
          eyebrow="Laboratory · Capabilities"
          title="The pipeline, with the methods note for each stage."
        />
        <ol className="border-border/80 mt-6 flex flex-col overflow-hidden rounded-lg border bg-card">
          {CAPABILITIES.map((c, i) => (
            <li
              key={c.no}
              className={cn(i > 0 && "border-border/80 border-t")}
            >
              <Link
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group hover:bg-muted/40 grid grid-cols-[auto_1fr_auto] items-baseline gap-6 px-5 py-5 transition-colors md:px-7 md:py-6"
              >
                <span className="text-highlight font-mono text-[11.5px] tracking-[0.2em] tabular-nums">
                  {c.no}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-foreground group-hover:text-accent text-[1.1rem] font-semibold tracking-[-0.015em] transition-colors">
                    {c.title}
                  </h3>
                  <p className="text-muted-foreground max-w-prose text-[14px] leading-relaxed">
                    {c.body}
                  </p>
                </div>
                <span className="text-muted-foreground group-hover:text-accent text-xs font-medium tracking-wide transition-colors">
                  Methods note →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
        <span className="bg-highlight inline-block h-[3px] w-7" />
        <span>{eyebrow}</span>
      </div>
      <h2 className="font-display text-foreground text-[1.55rem] font-semibold leading-tight tracking-[-0.018em] sm:text-[1.7rem]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-muted-foreground max-w-2xl text-[14.5px] leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
