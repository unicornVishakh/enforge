import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Project, AuditLog } from "@/lib/types/database";

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
  return { title: `Settings · ${data?.name ?? "Project"}` };
}

export default async function ProjectSettingsPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: project }, { data: audit }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("audit_log")
      .select("*")
      .eq("entity_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!project) notFound();
  const p = project as Project;
  const events = (audit ?? []) as AuditLog[];

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Project settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">{p.name}</h1>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">
            Activity
            <Badge variant="outline" className="ml-2 font-mono text-[10px]">
              {events.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card className="space-y-3 p-5">
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="font-medium">{p.name}</dd>
              <dt className="text-muted-foreground">Substrate</dt>
              <dd className="font-mono">{p.substrate ?? "—"}</dd>
              <dt className="text-muted-foreground">Product</dt>
              <dd className="font-mono">{p.product ?? "—"}</dd>
              <dt className="text-muted-foreground">Target reaction</dt>
              <dd className="font-mono text-xs">{p.target_reaction ?? "—"}</dd>
              <dt className="text-muted-foreground">Created</dt>
              <dd className="font-mono text-xs">
                {new Date(p.created_at).toLocaleString()}
              </dd>
            </dl>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="overflow-hidden">
            {events.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground text-sm">
                  No activity yet for this project.
                </p>
              </div>
            ) : (
              <ul className="divide-border/40 divide-y">
                {events.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                    <span className="bg-accent/20 text-accent mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md font-mono text-[10px]">
                      {actionInitials(e.action)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-mono">{e.action}</span>
                      </div>
                      <p className="text-muted-foreground/80 mt-0.5 line-clamp-1 font-mono text-[10px]">
                        {summarizePayload(e.payload)}
                      </p>
                    </div>
                    <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function actionInitials(action: string): string {
  const parts = action.split(".");
  return (parts[0]?.[0] ?? "?").toUpperCase();
}

function summarizePayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const obj = payload as Record<string, unknown>;
  return Object.entries(obj)
    .slice(0, 3)
    .map(([k, v]) => {
      if (typeof v === "object" && v !== null) {
        const s = JSON.stringify(v);
        return `${k}=${s.slice(0, 30)}${s.length > 30 ? "…" : ""}`;
      }
      return `${k}=${String(v)}`;
    })
    .join("  ·  ");
}
