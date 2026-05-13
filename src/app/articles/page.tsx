import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import {
  type ArticleCategory,
  CATEGORY_LABELS,
  getArticles,
  getArticlesByCategory,
} from "@/content/articles";

export const metadata = {
  title: "Articles · EnzymeForge",
  description:
    "Methods, programme briefs, perspectives, and methodological disclosures from the EnzymeForge laboratory.",
};

const FILTERS: { value: ArticleCategory | "all"; label: string }[] = [
  { value: "all", label: "All articles" },
  { value: "methods", label: "Methods" },
  { value: "programme", label: "Programme briefs" },
  { value: "perspective", label: "Perspectives" },
  { value: "disclosure", label: "Disclosures" },
];

export default async function ArticlesIndex({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const raw = params.category ?? "all";
  const active = (FILTERS.find((f) => f.value === raw)?.value ??
    "all") as ArticleCategory | "all";

  const articles = getArticlesByCategory(active);
  const [feature, ...rest] = articles;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        {/* Page masthead */}
        <section className="border-border/80 border-b bg-card/40">
          <div className="mx-auto max-w-7xl px-6 pt-14 pb-10 sm:pt-20 sm:pb-12">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
              Laboratory · Editorial
            </p>
            <h1 className="font-display text-foreground mt-3 text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.022em] sm:text-5xl">
              Articles from the laboratory.
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl text-lg leading-relaxed">
              Methods notes, programme briefs, perspectives, and the running
              methodological disclosure. Each piece is signed, dated, and
              written by someone on the engineering team.
            </p>

            <div className="border-border/60 mt-9 flex flex-wrap items-center gap-1 border-b">
              {FILTERS.map((f) => {
                const isActive = active === f.value;
                const href =
                  f.value === "all" ? "/articles" : `/articles?category=${f.value}`;
                return (
                  <Link
                    key={f.value}
                    href={href}
                    className={
                      "relative -mb-px px-3 py-2.5 text-sm font-medium transition-colors " +
                      (isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    {f.label}
                    {isActive && (
                      <span className="bg-highlight absolute inset-x-3 bottom-0 h-0.5" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {articles.length === 0 ? (
          <div className="mx-auto max-w-7xl px-6 py-20">
            <p className="text-muted-foreground">
              No articles in this category yet.
            </p>
          </div>
        ) : (
          <>
            {/* Featured */}
            <section className="mx-auto max-w-7xl px-6 pt-12">
              <Link
                href={`/articles/${feature.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group border-border/80 bg-card hover:border-accent/40 grid gap-8 rounded-lg border p-6 transition-colors md:grid-cols-[1.05fr_1fr] md:p-8"
              >
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="bg-highlight inline-block size-1.5 rounded-full" />
                    <span className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
                      Featured · {CATEGORY_LABELS[feature.category]}
                    </span>
                  </div>
                  <h2 className="font-display text-foreground group-hover:text-accent mt-3 text-2xl font-semibold leading-tight tracking-[-0.018em] transition-colors sm:text-[1.85rem]">
                    {feature.title}
                  </h2>
                  <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
                    {feature.subtitle}
                  </p>
                  <div className="text-muted-foreground mt-5 flex items-center gap-3 text-xs">
                    <span>{feature.byline}</span>
                    <span aria-hidden>·</span>
                    <span className="font-mono">{feature.publishedLabel}</span>
                    <span aria-hidden>·</span>
                    <span>{feature.readingMinutes} min read</span>
                  </div>
                  <span className="text-accent mt-6 inline-flex items-center gap-1.5 text-sm font-medium">
                    Read the article
                    <ArrowRight className="size-4" />
                  </span>
                </div>
                <ArticleVignette article={feature} />
              </Link>
            </section>

            {/* Grid */}
            <section className="mx-auto max-w-7xl px-6 py-12">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {rest.map((a) => (
                  <ArticleCard key={a.slug} article={a} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function ArticleCard({
  article,
}: {
  article: ReturnType<typeof getArticles>[number];
}) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group border-border/80 bg-card hover:border-accent/40 flex flex-col rounded-lg border p-6 transition-colors"
    >
      <ArticleVignette article={article} compact />
      <div className="text-muted-foreground mt-5 flex items-center gap-2 text-[11px] font-mono tracking-[0.16em] uppercase">
        <span className="bg-highlight inline-block size-1.5 rounded-full" />
        {CATEGORY_LABELS[article.category]}
      </div>
      <h3 className="font-display text-foreground group-hover:text-accent mt-2 text-[1.1rem] font-semibold leading-snug tracking-[-0.015em] transition-colors">
        {article.title}
      </h3>
      <p className="text-muted-foreground mt-2 line-clamp-3 text-sm leading-relaxed">
        {article.subtitle.replace(/<[^>]+>/g, "")}
      </p>
      <div className="text-muted-foreground/80 mt-4 flex items-center gap-2 font-mono text-[10.5px] tracking-wide">
        <span>{article.publishedLabel}</span>
        <span aria-hidden>·</span>
        <span>{article.readingMinutes} MIN</span>
      </div>
    </Link>
  );
}

function ArticleVignette({
  article,
  compact = false,
}: {
  article: ReturnType<typeof getArticles>[number];
  compact?: boolean;
}) {
  // A small generated "specimen" panel that stands in for an image
  // without leaning on stock photography. The composition varies
  // deterministically per slug.
  const palette: Record<string, { fg: string; bg: string }> = {
    methods: { fg: "oklch(0.46 0.16 264)", bg: "oklch(0.97 0.014 247)" },
    programme: { fg: "oklch(0.55 0.13 60)", bg: "oklch(0.97 0.014 80)" },
    perspective: { fg: "oklch(0.38 0.08 280)", bg: "oklch(0.97 0.012 290)" },
    disclosure: { fg: "oklch(0.36 0.05 220)", bg: "oklch(0.96 0.008 220)" },
  };
  const c = palette[article.category];
  const height = compact ? 110 : 220;
  // Hashable seed for deterministic node positions
  const seed = Array.from(article.slug).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const nodes = Array.from({ length: 9 }, (_, i) => {
    const x = ((seed * (i + 3)) % 90) + 5;
    const y = (((seed >> 2) * (i + 1)) % 70) + 12;
    const r = 1.6 + ((seed + i) % 4) * 0.5;
    return { x, y, r };
  });

  return (
    <div
      className="border-border/70 relative w-full overflow-hidden rounded-md border"
      style={{ background: c.bg, height }}
      aria-hidden
    >
      <svg
        viewBox="0 0 100 80"
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
              strokeOpacity={0.18}
              strokeWidth={0.18}
            />
          )),
        )}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={c.fg} opacity={0.78} />
        ))}
      </svg>
      <div className="absolute right-3 bottom-2 font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: c.fg }}>
        Fig · {article.slug.split("-").slice(0, 2).join("·")}
      </div>
    </div>
  );
}
