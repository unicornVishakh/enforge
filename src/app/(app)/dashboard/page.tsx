import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types/database";

export const metadata = { title: "Dashboard · EnzymeForge.ai" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, workspace_id, name, target_reaction, substrate, product, conditions, created_by, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  const list = (projects ?? []) as Project[];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">
      <header className="space-y-1">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Dashboard
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
        </h1>
        <p className="text-muted-foreground text-sm">
          Pick up where you left off, or start a new discovery run.
        </p>
      </header>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Recent projects
            </h2>
            <p className="text-muted-foreground text-sm">
              The last six discovery runs in this workspace.
            </p>
          </div>
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            View all →
          </Link>
        </div>

        {list.length === 0 ? (
          <Card className="border-dashed p-10 text-center">
            <p className="text-muted-foreground text-sm">
              No projects yet. Create your first to begin discovering enzymes.
            </p>
            <Link
              href="/projects/new"
              className={cn(buttonVariants({ size: "sm" }), "mt-4")}
            >
              New project
              <ArrowRight />
            </Link>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="group hover:border-accent/40 hover:bg-card border-border/60 bg-card/40 rounded-xl border p-4 transition-colors"
              >
                <h3 className="line-clamp-1 font-medium">{p.name}</h3>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {p.target_reaction ||
                    [p.substrate, p.product].filter(Boolean).join(" → ") ||
                    "No target reaction set"}
                </p>
                <p className="text-muted-foreground/60 mt-3 font-mono text-[10px] tracking-wide">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

