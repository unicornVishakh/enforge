import Link from "next/link";
import { ArrowRight, FolderPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { Project } from "@/lib/types/database";

export const metadata = { title: "Projects · EnzymeForge.ai" };

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  const list = (projects ?? []) as Project[];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
            Projects
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            All projects
          </h1>
          <p className="text-muted-foreground text-sm">
            Each project tracks one target reaction and the candidates you
            discover for it.
          </p>
        </div>
        <Link href="/projects/new" className={cn(buttonVariants({ size: "sm" }))}>
          <FolderPlus />
          New project
        </Link>
      </header>

      {list.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <h2 className="text-lg font-semibold">No projects yet</h2>
          <p className="text-muted-foreground mx-auto mt-2 max-w-md text-sm">
            Create a project to start retrieving enzymes for a substrate-product
            pair, then generate variants and rank candidates.
          </p>
          <Link
            href="/projects/new"
            className={cn(buttonVariants({ size: "sm" }), "mt-6")}
          >
            New project
            <ArrowRight />
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="group hover:border-accent/40 hover:bg-card border-border/60 bg-card/40 block rounded-xl border p-4 transition-colors"
              >
                <h3 className="line-clamp-1 font-medium">{p.name}</h3>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
                  {p.target_reaction ||
                    [p.substrate, p.product].filter(Boolean).join(" → ") ||
                    "No target reaction set"}
                </p>
                <div className="text-muted-foreground/60 mt-3 flex items-center gap-2 font-mono text-[10px] tracking-wide">
                  <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  {p.substrate && p.product && (
                    <span className="bg-border/60 inline-block size-1 rounded-full" />
                  )}
                  {p.substrate && p.product && (
                    <span className="truncate">
                      {p.substrate} → {p.product}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
