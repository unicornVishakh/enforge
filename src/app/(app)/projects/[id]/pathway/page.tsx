import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PathwayClient } from "./pathway-client";
import type { Project, PathwayDesign } from "@/lib/types/database";
import type { PathwayGraph } from "@/lib/scoring/pathway";

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
  return { title: `Pathway · ${data?.name ?? "Project"}` };
}

export default async function PathwayPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: latest }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("pathway_designs")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!project) notFound();
  const p = project as Project;
  const cached = (latest as PathwayDesign | null)?.graph as PathwayGraph | null;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Pathway designer
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
        <p className="text-muted-foreground text-sm">
          {p.substrate} → {p.product}
        </p>
      </header>

      <PathwayClient
        projectId={p.id}
        substrate={p.substrate ?? ""}
        product={p.product ?? ""}
        initial={cached}
      />
    </div>
  );
}
