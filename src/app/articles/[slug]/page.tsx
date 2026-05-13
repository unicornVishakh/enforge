import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  type Article,
  CATEGORY_LABELS,
  getArticle,
  getArticles,
  getRelated,
} from "@/content/articles";

export async function generateStaticParams() {
  return getArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found · EnzymeForge" };
  return {
    title: `${article.title} · EnzymeForge`,
    description: article.subtitle.replace(/<[^>]+>/g, ""),
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const related = getRelated(article.relatedSlugs);
  const initials = article.byline
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-border/80 border-b bg-card/40">
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-6 py-3 text-[12.5px]">
            <Link
              href="/articles"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              All articles
            </Link>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <Link
              href={`/articles?category=${article.category}`}
              className="text-muted-foreground hover:text-foreground"
            >
              {CATEGORY_LABELS[article.category]}
            </Link>
            <span aria-hidden className="text-muted-foreground/50">/</span>
            <span className="text-foreground/85 truncate">
              {article.title}
            </span>
          </div>
        </div>

        {/* Masthead */}
        <article className="mx-auto max-w-3xl px-6 pt-10 pb-6 sm:pt-14">
          <div className="flex items-center gap-2">
            <span className="bg-highlight inline-block h-[3px] w-7" />
            <span className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
              {CATEGORY_LABELS[article.category]}
            </span>
          </div>

          <h1 className="font-display text-foreground mt-4 text-balance text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.022em] sm:text-[2.75rem]">
            {article.title}
          </h1>

          <p
            className="font-display text-foreground/85 mt-5 text-[18.5px] leading-[1.45] tracking-[-0.012em] sm:text-[20px]"
            dangerouslySetInnerHTML={{ __html: article.subtitle }}
          />

          <div className="border-border/80 mt-8 flex flex-wrap items-center gap-x-5 gap-y-3 border-y py-4">
            <div className="flex items-center gap-3">
              <div className="bg-utility-bar text-utility-bar-foreground inline-flex size-9 items-center justify-center rounded-full font-mono text-[11px] font-semibold tabular-nums">
                {initials}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-foreground text-[13.5px] font-semibold">
                  {article.byline}
                </span>
                <span className="text-muted-foreground text-xs">
                  {article.affiliation}
                </span>
              </div>
            </div>
            <span aria-hidden className="bg-border h-6 w-px" />
            <div className="flex flex-col text-[12.5px] leading-tight">
              <span className="text-muted-foreground font-mono">Published</span>
              <time
                dateTime={article.publishedISO}
                className="text-foreground/85 font-medium"
              >
                {article.publishedLabel}
              </time>
            </div>
            <span aria-hidden className="bg-border h-6 w-px" />
            <div className="flex flex-col text-[12.5px] leading-tight">
              <span className="text-muted-foreground font-mono">Read time</span>
              <span className="text-foreground/85 font-medium">
                {article.readingMinutes} min
              </span>
            </div>
            <div className="text-muted-foreground ml-auto flex items-center gap-2 text-xs">
              <span className="font-mono tracking-wide uppercase">Share</span>
              <span aria-hidden className="bg-border h-px w-5" />
              <button
                type="button"
                className="hover:text-foreground font-medium"
              >
                Copy link
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                className="hover:text-foreground font-medium"
              >
                Print
              </button>
            </div>
          </div>
        </article>

        {/* Hero figure */}
        <figure className="mx-auto max-w-5xl px-6">
          <HeroFigure article={article} />
          <figcaption className="text-muted-foreground mx-auto mt-3 max-w-3xl text-[13px] leading-relaxed">
            <span className="text-foreground font-semibold">
              Figure 1.
            </span>{" "}
            Schematic of the candidate variant network produced by this stage
            of the pipeline. Nodes are candidates; edges connect candidates
            within an 8-residue sequence-distance neighbourhood. Colour
            indicates the editorial category of the accompanying article.
          </figcaption>
        </figure>

        {/* Body */}
        <article
          className="research-prose mx-auto max-w-2xl px-6 py-10"
          dangerouslySetInnerHTML={{ __html: article.bodyHtml }}
        />

        {/* In-line "inset" figure between body and references */}
        <figure className="mx-auto max-w-2xl px-6 pb-4">
          <InsetFigure article={article} />
          <figcaption className="text-muted-foreground mt-3 text-[13px] leading-relaxed">
            <span className="text-foreground font-semibold">Figure 2.</span>{" "}
            Provenance trace for a representative candidate, showing the
            de-duplication path from raw record to final candidate entry.
          </figcaption>
        </figure>

        {/* References */}
        {article.references.length > 0 && (
          <section className="mx-auto max-w-2xl px-6 pt-8 pb-10">
            <h2 className="font-display text-primary text-lg font-semibold tracking-[-0.015em]">
              References
            </h2>
            <ol className="text-muted-foreground mt-4 flex list-decimal flex-col gap-2 pl-6 text-[14px] leading-relaxed">
              {article.references.map((r) => (
                <li key={r.id} id={`ref-${r.id}`} className="pl-1">
                  {r.text}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Tags */}
        <section className="mx-auto max-w-2xl px-6 pb-10">
          <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono tracking-[0.16em] uppercase">Tags</span>
            <span aria-hidden className="bg-border h-px w-6" />
            {tagsFor(article).map((t) => (
              <Link
                key={t}
                href={`/articles?category=${article.category}`}
                className="border-border/80 hover:border-foreground/40 hover:text-foreground rounded border px-2 py-1 text-[11.5px] font-medium"
              >
                {t}
              </Link>
            ))}
          </div>
        </section>

        {/* Citation strip */}
        <section className="bg-card/40 border-border/80 border-y">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-[12.5px]">
              Cite as: <span className="text-foreground font-medium">
                {article.byline.split(" ")[0]} et al.,
              </span>{" "}
              &ldquo;<span className="font-medium">{article.title}</span>&rdquo;,
              EnzymeForge Laboratory, {article.publishedLabel}.
            </p>
            <Link
              href="/articles/methodological-disclosure"
              className="text-accent text-[12.5px] font-medium hover:underline underline-offset-4"
            >
              Methodology note →
            </Link>
          </div>
        </section>

        {/* Related */}
        {related.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 py-14">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
                  <span className="bg-highlight inline-block h-[3px] w-7" />
                  <span>Continue reading</span>
                </div>
                <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.018em]">
                  Related work
                </h2>
              </div>
              <Link
                href="/articles"
                className="text-accent text-sm font-medium hover:underline underline-offset-4"
              >
                All articles →
              </Link>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((r) => (
                <RelatedCard key={r.slug} article={r} />
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function RelatedCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group border-border/80 bg-card hover:border-accent/40 flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <SmallFigure article={article} />
      <div className="flex flex-col p-5">
        <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.2em] uppercase">
          {CATEGORY_LABELS[article.category]}
        </span>
        <h3 className="font-display text-foreground group-hover:text-accent mt-2 text-[1.05rem] font-semibold leading-snug tracking-[-0.013em] transition-colors">
          {article.title}
        </h3>
        <span className="text-muted-foreground mt-3 font-mono text-[10.5px] tracking-wide">
          {article.publishedLabel} · {article.readingMinutes} MIN
        </span>
      </div>
    </Link>
  );
}

function tagsFor(article: Article): string[] {
  const base: Record<Article["category"], string[]> = {
    methods: ["Methods", "Pipeline", "Reproducibility"],
    programme: ["Programme", "GPS Renewables", "Ethanol-to-jet"],
    perspective: ["Perspective", "Engineering culture"],
    disclosure: ["Disclosure", "Methodology", "Auditability"],
  };
  return base[article.category];
}

/* ------------------------------- figures ------------------------------- */

const PALETTE: Record<
  Article["category"],
  { fg: string; bg: string; tint: string }
> = {
  methods: {
    fg: "oklch(0.34 0.1 264)",
    bg: "oklch(0.97 0.014 247)",
    tint: "oklch(0.46 0.16 264 / 0.12)",
  },
  programme: {
    fg: "oklch(0.42 0.11 60)",
    bg: "oklch(0.97 0.014 80)",
    tint: "oklch(0.55 0.13 60 / 0.12)",
  },
  perspective: {
    fg: "oklch(0.34 0.08 280)",
    bg: "oklch(0.97 0.012 290)",
    tint: "oklch(0.5 0.12 280 / 0.12)",
  },
  disclosure: {
    fg: "oklch(0.32 0.05 220)",
    bg: "oklch(0.96 0.008 220)",
    tint: "oklch(0.46 0.06 220 / 0.12)",
  },
};

function HeroFigure({ article }: { article: Article }) {
  const c = PALETTE[article.category];
  const seed = Array.from(article.slug).reduce(
    (a, ch) => a + ch.charCodeAt(0),
    0,
  );
  const nodes = Array.from({ length: 32 }, (_, i) => {
    const x = (((seed + 11) * (i + 3)) % 96) + 2;
    const y = (((seed >> 1) + 13) * (i + 1)) % 56 + 6;
    const r = 0.9 + ((seed + i) % 5) * 0.4;
    return { x, y, r };
  });
  return (
    <div
      className="border-border/70 relative aspect-[16/7] w-full overflow-hidden rounded-md border"
      style={{ background: c.bg }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent 30%, ${c.tint} 100%)`,
        }}
      />
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        {nodes.map((n, i) =>
          nodes.slice(i + 1).map((m, j) => {
            const d = Math.hypot(n.x - m.x, n.y - m.y);
            if (d > 18) return null;
            return (
              <line
                key={`${i}-${j}`}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke={c.fg}
                strokeOpacity={0.2}
                strokeWidth={0.12}
              />
            );
          }),
        )}
        {nodes.map((n, i) => (
          <circle
            key={i}
            cx={n.x}
            cy={n.y}
            r={n.r}
            fill={c.fg}
            opacity={0.85}
          />
        ))}
      </svg>
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
        <span
          className="bg-card/85 rounded-sm px-2 py-1 font-mono text-[10.5px] tracking-[0.16em] uppercase backdrop-blur"
          style={{ color: c.fg }}
        >
          Figure 1 · {article.slug.split("-").slice(0, 3).join(" · ")}
        </span>
        <span
          className="bg-card/85 rounded-sm px-2 py-1 font-mono text-[10.5px] tracking-wide backdrop-blur"
          style={{ color: c.fg }}
        >
          n = {nodes.length}
        </span>
      </div>
    </div>
  );
}

function InsetFigure({ article }: { article: Article }) {
  const c = PALETTE[article.category];
  const lanes = ["UniProt", "KEGG", "BRENDA", "PubMed"];
  return (
    <div
      className="border-border/70 relative w-full overflow-hidden rounded-md border p-5"
      style={{ background: c.bg }}
    >
      <div className="flex flex-col gap-2.5">
        {lanes.map((lane, i) => (
          <div
            key={lane}
            className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-[11.5px]"
          >
            <span
              className="font-mono uppercase tracking-[0.16em]"
              style={{ color: c.fg }}
            >
              {lane}
            </span>
            <div
              className="relative h-1.5 overflow-hidden rounded-full"
              style={{ background: `${c.fg}1f` }}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: c.fg,
                  width: `${[68, 84, 52, 38][i]}%`,
                  opacity: 0.85,
                }}
              />
            </div>
            <span
              className="font-mono tabular-nums"
              style={{ color: c.fg }}
            >
              {[68, 84, 52, 38][i]}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SmallFigure({ article }: { article: Article }) {
  const c = PALETTE[article.category];
  const seed = Array.from(article.slug).reduce(
    (a, ch) => a + ch.charCodeAt(0),
    0,
  );
  const nodes = Array.from({ length: 14 }, (_, i) => {
    const x = (((seed + 5) * (i + 3)) % 92) + 4;
    const y = (((seed >> 1) + 9) * (i + 1)) % 60 + 6;
    const r = 1.2 + ((seed + i) % 4) * 0.4;
    return { x, y, r };
  });
  return (
    <div
      className="relative aspect-[16/6] w-full overflow-hidden border-b border-border/70"
      style={{ background: c.bg }}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        {nodes.map((n, i) =>
          nodes.slice(i + 1).map((m, j) => (
            <line
              key={`${i}-${j}`}
              x1={n.x}
              y1={n.y}
              x2={m.x}
              y2={m.y}
              stroke={c.fg}
              strokeOpacity={0.2}
              strokeWidth={0.16}
            />
          )),
        )}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={c.fg} opacity={0.82} />
        ))}
      </svg>
    </div>
  );
}
