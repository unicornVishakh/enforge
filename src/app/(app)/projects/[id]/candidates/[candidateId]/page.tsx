import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, FileDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProteinViewer } from "@/components/visualizations/protein-viewer";
import { Progress } from "@/components/ui/progress";
import { CommentThread } from "@/components/feedback/comment-thread";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EnzymeCandidate,
  Mutation,
  Prediction,
  Comment,
  Profile,
} from "@/lib/types/database";

interface PageProps {
  params: Promise<{ id: string; candidateId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { candidateId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("enzyme_candidates")
    .select("name")
    .eq("id", candidateId)
    .maybeSingle();
  return { title: `${data?.name ?? "Candidate"} · EnzymeForge.ai` };
}

export default async function CandidatePage({ params }: PageProps) {
  const { id, candidateId } = await params;
  const supabase = await createClient();
  const [
    { data: candidate },
    { data: predictions },
    { data: comments },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("enzyme_candidates")
      .select("*")
      .eq("id", candidateId)
      .maybeSingle(),
    supabase
      .from("predictions")
      .select("*")
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false }),
    supabase
      .from("comments")
      .select("*")
      .eq("entity_type", "candidate")
      .eq("entity_id", candidateId)
      .order("created_at", { ascending: true }),
    supabase.auth.getUser(),
  ]);
  if (!candidate) notFound();
  const allComments = (comments ?? []) as Comment[];
  // Hydrate author names
  const authorIds = Array.from(new Set(allComments.map((c) => c.user_id)));
  const profiles =
    authorIds.length > 0
      ? (
          await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", authorIds)
        ).data
      : [];
  const profileById = new Map(((profiles ?? []) as Profile[]).map((p) => [p.id, p]));
  const commentsHydrated = allComments.map((c) => ({
    id: c.id,
    user_id: c.user_id,
    body: c.body,
    created_at: c.created_at,
    author_name: profileById.get(c.user_id)?.full_name ?? null,
    author_email: profileById.get(c.user_id)?.email ?? null,
  }));
  const myProfile = user ? profileById.get(user.id) : null;

  const c = candidate as EnzymeCandidate;
  const preds = (predictions ?? []) as Prediction[];
  const latest = preds[0];
  const mutations = (c.mutations as unknown as Mutation[]) ?? [];

  // For variants without their own PDB ID, fall back to the parent's.
  let parentPdbId: string | null = null;
  if (!c.pdb_id && c.parent_id) {
    const { data: parent } = await supabase
      .from("enzyme_candidates")
      .select("pdb_id")
      .eq("id", c.parent_id)
      .maybeSingle();
    parentPdbId = parent?.pdb_id ?? null;
  }
  const pdbId = c.pdb_id ?? parentPdbId;
  const highlightPositions = mutations.map((m) => m.position);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 md:p-8">
      <header className="space-y-2">
        <Link
          href={`/projects/${id}/discover`}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
        >
          <ArrowLeft className="size-3" />
          Back to discovery
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
              {c.source === "generated" ? "AI-generated variant" : "Database candidate"}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{c.name}</h1>
            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
              {c.ec_number && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  EC {c.ec_number}
                </Badge>
              )}
              {c.organism && <span className="italic">{c.organism}</span>}
              {c.source_id && c.source === "db" && (
                <a
                  href={`https://www.uniprot.org/uniprotkb/${c.source_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  UniProt {c.source_id} <ExternalLink className="inline-block size-2.5" />
                </a>
              )}
              {pdbId && (
                <a
                  href={`https://www.rcsb.org/structure/${pdbId.toUpperCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  PDB {pdbId.toUpperCase()} <ExternalLink className="inline-block size-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure">3D Structure</TabsTrigger>
          <TabsTrigger value="comments">
            Comments
            <Badge variant="outline" className="ml-1.5 font-mono text-[10px]">
              {commentsHydrated.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="experiments">Experiments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {latest ? (
            <Card className="grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
              <ScoreBlock label="Activity" value={latest.activity_score} />
              <ScoreBlock label="Stability" value={latest.stability_score} />
              <ScoreBlock label="Expression" value={latest.expression_score} />
              <ScoreBlock
                label="Predicted yield"
                value={latest.predicted_yield}
                ci={[latest.confidence_lower, latest.confidence_upper]}
                highlight
              />
            </Card>
          ) : (
            <Card className="p-5">
              <p className="text-muted-foreground text-sm">
                No predictions yet. Open the discovery workflow and run scoring.
              </p>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="space-y-3 p-5 lg:col-span-2">
              <h2 className="text-sm font-semibold">Sequence</h2>
              <p className="text-muted-foreground text-[11px]">
                {c.sequence.length}aa · mutations highlighted in green
              </p>
              <SequenceBlock
                sequence={c.sequence}
                highlight={highlightPositions}
              />
            </Card>
            <Card className="space-y-3 p-5">
              <h2 className="text-sm font-semibold">Mutations</h2>
              {mutations.length === 0 ? (
                <p className="text-muted-foreground text-xs">
                  No mutations — this is a database-sourced enzyme.
                </p>
              ) : (
                <ul className="space-y-1.5 font-mono text-xs">
                  {mutations.map((m, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>
                        <span className="text-muted-foreground">{m.from}</span>
                        <span className="mx-0.5 font-bold">{m.position}</span>
                        <span className="text-accent">{m.to}</span>
                      </span>
                      {typeof m.score === "number" && (
                        <span className="text-muted-foreground text-[10px]">
                          {m.score.toFixed(3)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="structure" className="space-y-3">
          <Card className="space-y-3 p-5">
            <header className="flex items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">3D structure</h2>
                <p className="text-muted-foreground text-[11px]">
                  {pdbId
                    ? `Rendered from RCSB PDB ${pdbId.toUpperCase()}. Mutated residues marked in green.`
                    : "No PDB structure available for this candidate."}
                </p>
              </div>
            </header>
            <ProteinViewer
              pdbId={pdbId}
              highlightPositions={highlightPositions.length ? highlightPositions : undefined}
            />
          </Card>
        </TabsContent>

        <TabsContent value="comments">
          {user && (
            <CommentThread
              entityType="candidate"
              entityId={c.id}
              initialComments={commentsHydrated}
              currentUserId={user.id}
              currentUserName={myProfile?.full_name ?? user.email ?? "User"}
            />
          )}
        </TabsContent>

        <TabsContent value="experiments">
          <Card className="space-y-3 p-5">
            <h2 className="text-sm font-semibold">Experiments</h2>
            <p className="text-muted-foreground text-xs">
              Log experiments from{" "}
              <Link
                href={`/projects/${id}/experiments`}
                className="text-accent hover:underline"
              >
                the project experiments page
              </Link>
              .
            </p>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
        <a
          href={`/api/export?projectId=${id}&candidateIds=${c.id}&format=fasta`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <FileDown />
          FASTA
        </a>
        <a
          href={`/api/export?projectId=${id}&candidateIds=${c.id}&format=json`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <FileDown />
          JSON
        </a>
        <a
          href={`/api/export?projectId=${id}&candidateIds=${c.id}&format=csv`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <FileDown />
          CSV
        </a>
      </div>
    </div>
  );
}

function ScoreBlock({
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
          CI {ci[0].toFixed(2)}–{ci[1].toFixed(2)}
        </p>
      )}
    </div>
  );
}

function SequenceBlock({
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
