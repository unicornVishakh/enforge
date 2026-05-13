import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  ChartScatter,
  FlaskConical,
  Network,
  Sparkles,
  Database,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project, EnzymeCandidate } from "@/lib/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .maybeSingle();
  return { title: `${data?.name ?? "Project"} · EnzymeForge.ai` };
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: project }, { data: candidates, count }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("enzyme_candidates")
      .select("*", { count: "exact" })
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (!project) notFound();
  const p = project as Project;
  const recent = (candidates ?? []) as EnzymeCandidate[];
  const total = count ?? recent.length;

  const conditions = (p.conditions ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Project
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
        {p.name.includes("Ethanol → Jet Fuel") && (
          <p className="text-muted-foreground text-xs italic">
            Aligned with GPS Renewables&apos; commercial pipeline.
          </p>
        )}
        <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
          {p.substrate && p.product && (
            <span className="font-mono">
              {p.substrate}{" "}
              <span className="text-accent">→</span>{" "}
              {p.product}
            </span>
          )}
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono text-xs">
            Created {new Date(p.created_at).toLocaleDateString()}
          </span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StepCard
          href={`/projects/${p.id}/discover`}
          icon={Database}
          title="Retrieve & generate"
          subtitle={`${total} candidates`}
          primary
        />
        <StepCard
          href={`/projects/${p.id}/discover#predict`}
          icon={ChartScatter}
          title="Predict & rank"
          subtitle="Score variants with CIs"
        />
        <StepCard
          href={`/projects/${p.id}/pathway`}
          icon={Network}
          title="Pathway designer"
          subtitle="Substrate → product graph"
        />
        <StepCard
          href={`/projects/${p.id}/experiments`}
          icon={FlaskConical}
          title="Experiments"
          subtitle="Close the loop"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-5 lg:col-span-2">
          <header className="flex items-end justify-between">
            <div>
              <h2 className="text-base font-semibold">Recent candidates</h2>
              <p className="text-muted-foreground text-xs">
                Most recent {recent.length} of {total} enzymes in this project.
              </p>
            </div>
            <Link
              href={`/projects/${p.id}/discover`}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              View workflow →
            </Link>
          </header>

          {recent.length === 0 ? (
            <div className="border-border/60 rounded-lg border border-dashed p-8 text-center">
              <p className="text-muted-foreground text-sm">
                No candidates yet — start the discovery workflow.
              </p>
              <Link
                href={`/projects/${p.id}/discover`}
                className={cn(buttonVariants({ size: "sm" }), "mt-4")}
              >
                <Sparkles />
                Run retrieval
              </Link>
            </div>
          ) : (
            <ul className="divide-border/40 divide-y">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <div className="bg-accent/10 text-accent flex size-7 items-center justify-center rounded-md">
                    <Database className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/projects/${p.id}/candidates/${c.id}`}
                      className="line-clamp-1 text-sm font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                    <div className="text-muted-foreground line-clamp-1 font-mono text-[10px] tracking-wide">
                      {c.organism ?? "Unknown organism"}
                      {c.ec_number ? ` · EC ${c.ec_number}` : ""}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                    {c.source}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3 p-5">
          <h2 className="text-base font-semibold">Conditions</h2>
          {Object.keys(conditions).length === 0 ? (
            <p className="text-muted-foreground text-xs">
              No conditions specified.
            </p>
          ) : (
            <dl className="space-y-2 text-xs">
              {Object.entries(conditions).map(([k, v]) =>
                v == null || v === "" ? null : (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground capitalize">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="font-mono">{String(v)}</dd>
                  </div>
                ),
              )}
            </dl>
          )}
          {p.target_reaction && (
            <>
              <div className="border-border/40 my-2 border-t" />
              <p className="text-muted-foreground text-[10px] tracking-wider uppercase">
                Target reaction
              </p>
              <p className="font-mono text-xs leading-relaxed break-words">
                {p.target_reaction}
              </p>
            </>
          )}
        </Card>
      </section>

      <section className="flex justify-end">
        <Link
          href={`/projects/${p.id}/discover`}
          className={cn(buttonVariants({ size: "lg" }))}
        >
          Open discovery workflow
          <ArrowRight />
        </Link>
      </section>
    </div>
  );
}

function StepCard({
  href,
  icon: Icon,
  title,
  subtitle,
  primary,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-start gap-3 rounded-xl border p-4 transition-colors",
        primary
          ? "border-accent/40 bg-accent/5 hover:bg-accent/10"
          : "border-border/60 bg-card/40 hover:border-accent/40 hover:bg-card",
      )}
    >
      <div
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          primary ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
      <ArrowRight className="text-muted-foreground/50 group-hover:text-accent size-4 transition-colors" />
    </Link>
  );
}
