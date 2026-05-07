import Link from "next/link";
import {
  ArrowRight,
  Database,
  Sparkles,
  ChartScatter,
  Network,
  FileDown,
  FlaskConical,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Database,
    title: "Retrieve",
    body: "Query UniProt, KEGG, and BRENDA in parallel. Surface the enzymes that already catalyze your target chemistry — with provenance, kinetics, and recent literature.",
    chips: ["UniProt", "KEGG", "BRENDA", "PubMed"],
  },
  {
    icon: Sparkles,
    title: "Generate",
    body: "Compose mutation candidates using an ESM-2 masked language model. Score every position, every substitution, then rank multi-mutation variants by predicted impact.",
    chips: ["ESM-2", "320-d embeddings", "Multi-mutation"],
  },
  {
    icon: ChartScatter,
    title: "Predict",
    body: "Activity, thermostability, expression, and yield — each with a calibrated confidence interval. Compare candidates on a scatter plot or open the 3D structure to inspect.",
    chips: ["Activity", "Stability", "Expression", "Yield"],
  },
];

const STEPS = [
  { label: "Retrieve", short: "DB", icon: Database },
  { label: "Generate", short: "AI", icon: Sparkles },
  { label: "Predict", short: "ML", icon: ChartScatter },
  { label: "Visualize", short: "UI", icon: Network },
  { label: "Export", short: "Plan", icon: FileDown },
  { label: "Experiment", short: "Lab", icon: FlaskConical },
  { label: "Retrain", short: "Loop", icon: RefreshCw },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <Workflow />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <LogoMark />
          <span>EnzymeForge.ai</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "sm" }))}
          >
            Start discovering
            <ArrowRight />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function LogoMark() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      className="text-accent"
    >
      <circle cx="11" cy="11" r="8.5" />
      <path d="M5 11 Q 8 6, 11 11 T 17 11" strokeLinecap="round" fill="none" />
      <circle cx="5" cy="11" r="1.4" fill="currentColor" />
      <circle cx="11" cy="11" r="1.4" fill="currentColor" />
      <circle cx="17" cy="11" r="1.4" fill="currentColor" />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <BackgroundGrid />
      <div className="mx-auto max-w-6xl px-6 pt-24 pb-16 sm:pt-32 sm:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-muted-foreground mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 font-mono text-[11px] tracking-[0.18em] uppercase">
            <span className="bg-accent size-1.5 rounded-full" />
            Built with GPS Renewables · Ethanol-to-Jet
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Engineer enzymes{" "}
            <span className="text-accent">100x faster.</span>
          </h1>
          <p className="text-muted-foreground mt-6 text-lg leading-relaxed text-balance sm:text-xl">
            AI-driven discovery for sustainable fuels and chemicals — built for
            the teams turning ethanol into jet fuel, CO<sub>2</sub> into
            methanol, and biomass into anything.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "w-full sm:w-auto",
              )}
            >
              Start discovering
              <ArrowRight />
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "w-full sm:w-auto",
              )}
            >
              Sign in
            </Link>
          </div>
          <p className="text-muted-foreground/70 mt-6 text-xs">
            Free for academic research · No credit card required
          </p>
        </div>
      </div>
    </section>
  );
}

function BackgroundGrid() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.27_0_0_/_0.4)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.27_0_0_/_0.4)_1px,transparent_1px)] bg-[size:48px_48px] opacity-30" />
      <div className="from-background via-background absolute inset-0 bg-gradient-to-b to-transparent" />
      <div
        className="bg-accent/15 absolute top-1/3 left-1/2 -z-10 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px]"
      />
    </div>
  );
}

function Stats() {
  const stats = [
    { value: "320", label: "ESM-2 embedding dim" },
    { value: "100x", label: "faster than wet-lab screen" },
    { value: "≤8s", label: "variant generation latency" },
    { value: "30+", label: "biofuel enzymes pre-curated" },
  ];
  return (
    <section className="border-y border-border/40 bg-muted/20">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-border/40 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-6 py-8 text-center">
            <div className="font-mono text-2xl font-semibold tracking-tight sm:text-3xl">
              {s.value}
            </div>
            <div className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="max-w-2xl">
        <p className="text-accent mb-3 font-mono text-xs tracking-[0.2em] uppercase">
          Three pillars
        </p>
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          From substrate to candidate, in minutes.
        </h2>
        <p className="text-muted-foreground mt-4 text-lg">
          Retrieve, generate, and predict — composed into a single workflow
          a researcher can run while their coffee is still hot.
        </p>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="group relative flex flex-col rounded-2xl border border-border/60 bg-card/40 p-6 transition-colors hover:border-accent/40 hover:bg-card"
          >
            <div className="bg-accent/10 text-accent mb-4 inline-flex size-10 items-center justify-center rounded-lg">
              <f.icon className="size-5" />
            </div>
            <h3 className="text-lg font-semibold">{f.title}</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
              {f.body}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {f.chips.map((c) => (
                <span
                  key={c}
                  className="border-border/60 text-muted-foreground rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wide"
                >
                  {c}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Workflow() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-accent mb-3 font-mono text-xs tracking-[0.2em] uppercase">
            The loop
          </p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            A closed loop between code and bench.
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Predictions get logged. Experiments come back. The model
            recalibrates against your lab&apos;s reality — not a generic
            benchmark.
          </p>
        </div>

        <div className="mt-12 hidden md:block">
          <WorkflowDiagram />
        </div>
        <div className="mt-12 space-y-3 md:hidden">
          {STEPS.map((s, i) => (
            <div
              key={s.label}
              className="flex items-center gap-4 rounded-lg border border-border/60 bg-card/40 p-4"
            >
              <div className="bg-accent/10 text-accent flex size-9 items-center justify-center rounded-md">
                <s.icon className="size-4" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">{s.label}</div>
                <div className="text-muted-foreground font-mono text-[10px] uppercase">
                  Step {i + 1} · {s.short}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowDiagram() {
  const cellWidth = 140;
  const cellHeight = 90;
  const gap = 32;
  const totalWidth = STEPS.length * cellWidth + (STEPS.length - 1) * gap;
  const totalHeight = cellHeight + 100;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        className="text-foreground mx-auto"
        style={{ minWidth: totalWidth }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="oklch(0.65 0.18 152)" />
          </marker>
          <marker
            id="arrowhead-loop"
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 z" fill="oklch(0.65 0.18 152 / 0.7)" />
          </marker>
        </defs>

        {STEPS.map((step, i) => {
          const x = i * (cellWidth + gap);
          const y = 8;
          return (
            <g key={step.label}>
              <rect
                x={x}
                y={y}
                width={cellWidth}
                height={cellHeight}
                rx={12}
                fill="oklch(0.18 0 0)"
                stroke="oklch(0.27 0 0)"
              />
              <foreignObject x={x} y={y} width={cellWidth} height={cellHeight}>
                <div
                  // @ts-expect-error: foreignObject children render as HTML
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    padding: "16px",
                    color: "oklch(0.985 0 0)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: 1.5,
                      color: "oklch(0.65 0.18 152)",
                      textTransform: "uppercase",
                    }}
                  >
                    Step {i + 1} · {step.short}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 16, marginTop: 6 }}>
                    {step.label}
                  </div>
                </div>
              </foreignObject>
              {i < STEPS.length - 1 && (
                <line
                  x1={x + cellWidth + 4}
                  y1={y + cellHeight / 2}
                  x2={x + cellWidth + gap - 4}
                  y2={y + cellHeight / 2}
                  stroke="oklch(0.65 0.18 152)"
                  strokeWidth={1.5}
                  markerEnd="url(#arrowhead)"
                />
              )}
            </g>
          );
        })}

        {/* loop-back arrow from last step to first */}
        <path
          d={`M ${totalWidth - 20} ${cellHeight + 8}
              Q ${totalWidth} ${totalHeight - 4} ${totalWidth / 2} ${totalHeight - 4}
              T 20 ${cellHeight + 8}`}
          fill="none"
          stroke="oklch(0.65 0.18 152 / 0.5)"
          strokeWidth={1.2}
          strokeDasharray="4 4"
          markerEnd="url(#arrowhead-loop)"
        />
        <text
          x={totalWidth / 2}
          y={totalHeight - 12}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={10}
          fill="oklch(0.65 0.18 152 / 0.8)"
          letterSpacing={2}
        >
          FEEDBACK LOOP — RECALIBRATE
        </text>
      </svg>
    </div>
  );
}

function Closing() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <div className="rounded-2xl border border-border/60 bg-card/30 p-12 text-center">
        <ShieldCheck className="text-accent mx-auto mb-4 size-8" />
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Honest about what&apos;s real.
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl">
          Hugging Face calls hit ESM-2 directly. Database queries go to UniProt
          and KEGG live. Where we use a heuristic — variant generation,
          stability scoring — the UI says so. No silent mocking.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            Get started
            <ArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <LogoMark />
          <span>
            EnzymeForge.ai · Built for the GPS Renewables hackathon ·{" "}
            <span className="font-mono">2026</span>
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-4 text-xs">
          <span className="font-mono">v1.0.0-rc</span>
          <Link
            href="https://github.com"
            className="hover:text-foreground transition-colors"
          >
            Source
          </Link>
        </div>
      </div>
    </footer>
  );
}
