import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { buttonVariants } from "@/components/ui/button";
import {
  CATEGORY_LABELS,
  type Article,
  getArticles,
} from "@/content/articles";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const articles = getArticles();
  const [feature, ...rest] = articles;
  const secondary = rest.slice(0, 3);
  const remainder = rest.slice(3, 6);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">
        <Announcement />
        <FeaturedStory article={feature} />
        <SecondaryStories articles={secondary} />
        <Instrument />
        <CapabilitiesIndex />
        <LatestResearch articles={remainder} />
        <MissionStatement />
        <ClosingNote />
      </main>
      <SiteFooter />
    </div>
  );
}

function Announcement() {
  return (
    <div className="border-border/80 border-b bg-card/40">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-2.5 text-[12.5px]">
        <span className="bg-highlight text-highlight-foreground inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase">
          Programme
        </span>
        <p className="text-foreground/85 truncate">
          GPS Renewables · Ethanol-to-Jet enzyme engineering programme — v1.0.0-rc
          calibrated against 31 wildtype starting points.
        </p>
        <Link
          href="/articles/ethanol-to-jet-brief"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent ml-auto hidden shrink-0 font-medium hover:underline underline-offset-4 md:inline-flex"
        >
          Read the brief →
        </Link>
      </div>
    </div>
  );
}

function FeaturedStory({ article }: { article: Article }) {
  return (
    <section className="border-border/80 border-b">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        <div className="grid items-stretch gap-10 md:grid-cols-[1.15fr_1fr]">
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2">
              <span className="bg-highlight inline-block h-[3px] w-7" />
              <span className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
                Featured · {CATEGORY_LABELS[article.category]}
              </span>
            </div>
            <h1 className="font-display text-foreground mt-4 text-balance text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.022em] sm:text-[3.2rem]">
              {article.title}
            </h1>
            <p className="text-muted-foreground mt-5 max-w-2xl text-balance text-lg leading-relaxed">
              {article.subtitle.replace(/<[^>]+>/g, "")}
            </p>
            <div className="text-muted-foreground mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-foreground/85 font-medium">
                {article.byline}
              </span>
              <span aria-hidden>·</span>
              <span className="font-mono">{article.publishedLabel}</span>
              <span aria-hidden>·</span>
              <span>{article.readingMinutes} min read</span>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/articles/${article.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ size: "lg" }))}
              >
                Read the article
                <ArrowRight />
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Start a discovery run
              </Link>
            </div>
          </div>
          <FeatureVignette slug={article.slug} category={article.category} />
        </div>
      </div>
    </section>
  );
}

function FeatureVignette({
  slug,
  category,
}: {
  slug: string;
  category: Article["category"];
}) {
  const palette: Record<string, { fg: string; bg: string; tint: string }> = {
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
  const c = palette[category];

  const seed = Array.from(slug).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const nodes = Array.from({ length: 18 }, (_, i) => {
    const x = (((seed + 7) * (i + 3)) % 92) + 4;
    const y = (((seed >> 1) + 11) * (i + 1)) % 76 + 8;
    const r = 1.4 + ((seed + i) % 5) * 0.5;
    return { x, y, r };
  });

  return (
    <div
      className="border-border/70 relative overflow-hidden rounded-lg border"
      style={{ background: c.bg, minHeight: 320 }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent 0%, ${c.tint} 100%)`,
        }}
      />
      <svg
        viewBox="0 0 100 80"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        {nodes.map((n, i) =>
          nodes.slice(i + 1).map((m, j) => {
            const dx = n.x - m.x;
            const dy = n.y - m.y;
            const d = Math.hypot(dx, dy);
            if (d > 22) return null;
            return (
              <line
                key={`${i}-${j}`}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke={c.fg}
                strokeOpacity={0.22}
                strokeWidth={0.16}
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
            opacity={0.82}
          />
        ))}
      </svg>
      <div
        className="absolute bottom-4 left-5 right-5 flex items-end justify-between"
      >
        <span
          className="bg-card/80 rounded-sm px-2 py-1 font-mono text-[10.5px] tracking-[0.16em] uppercase backdrop-blur"
          style={{ color: c.fg }}
        >
          Fig 1 · candidate variant network
        </span>
        <span
          className="bg-card/80 rounded-sm px-2 py-1 font-mono text-[10.5px] tracking-wide backdrop-blur"
          style={{ color: c.fg }}
        >
          n = {nodes.length}
        </span>
      </div>
    </div>
  );
}

function SecondaryStories({ articles }: { articles: Article[] }) {
  return (
    <section className="bg-card/40 border-border/80 border-b">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
              In this week&rsquo;s editorial
            </p>
            <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.018em] sm:text-3xl">
              From the engineering team.
            </h2>
          </div>
          <Link
            href="/articles"
            className="text-accent hidden text-sm font-medium hover:underline underline-offset-4 sm:inline"
          >
            All articles →
          </Link>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/articles/${article.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group border-border/80 bg-card hover:border-accent/40 flex flex-col overflow-hidden rounded-lg border transition-colors"
    >
      <CardFigure article={article} />
      <div className="flex flex-1 flex-col p-6">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] uppercase">
          <span className="bg-highlight inline-block h-[2px] w-5" />
          {CATEGORY_LABELS[article.category]}
        </div>
        <h3 className="font-display text-foreground group-hover:text-accent mt-3 text-[1.15rem] font-semibold leading-snug tracking-[-0.015em] transition-colors">
          {article.title}
        </h3>
        <p className="text-muted-foreground mt-2 line-clamp-3 text-[14px] leading-relaxed">
          {article.subtitle.replace(/<[^>]+>/g, "")}
        </p>
        <div className="text-muted-foreground/80 mt-auto flex items-center gap-2 pt-5 font-mono text-[10.5px] tracking-wide">
          <span>{article.publishedLabel}</span>
          <span aria-hidden>·</span>
          <span>{article.readingMinutes} MIN</span>
        </div>
      </div>
    </Link>
  );
}

const CARD_FIGURE_PALETTE: Record<
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

function CardFigure({ article }: { article: Article }) {
  const c = CARD_FIGURE_PALETTE[article.category];
  const seed = Array.from(article.slug).reduce(
    (a, ch) => a + ch.charCodeAt(0),
    0,
  );
  const nodes = Array.from({ length: 16 }, (_, i) => {
    const x = (((seed + 7) * (i + 3)) % 94) + 3;
    const y = (((seed >> 1) + 11) * (i + 1)) % 56 + 6;
    const r = 1.0 + ((seed + i) % 5) * 0.35;
    return { x, y, r };
  });
  return (
    <div
      className="border-border/70 relative aspect-[16/8] w-full overflow-hidden border-b"
      style={{ background: c.bg }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(180deg, transparent 0%, ${c.tint} 100%)`,
        }}
      />
      <svg
        viewBox="0 0 100 60"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        {nodes.map((n, i) =>
          nodes.slice(i + 1).map((m, j) => {
            const d = Math.hypot(n.x - m.x, n.y - m.y);
            if (d > 20) return null;
            return (
              <line
                key={`${i}-${j}`}
                x1={n.x}
                y1={n.y}
                x2={m.x}
                y2={m.y}
                stroke={c.fg}
                strokeOpacity={0.22}
                strokeWidth={0.16}
              />
            );
          }),
        )}
        {nodes.map((n, i) => (
          <circle key={i} cx={n.x} cy={n.y} r={n.r} fill={c.fg} opacity={0.82} />
        ))}
      </svg>
      <span
        className="bg-card/85 absolute bottom-2 left-3 rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] tracking-[0.16em] uppercase backdrop-blur"
        style={{ color: c.fg }}
      >
        Fig · {article.slug.split("-").slice(0, 2).join(" · ")}
      </span>
    </div>
  );
}

function Instrument() {
  const stats = [
    { value: "320", label: "ESM-2 embedding dim", sub: "facebook/esm2_t6_8M" },
    { value: "≤ 8 s", label: "variant generation", sub: "p50 latency, single probe" },
    { value: "31", label: "programme enzymes", sub: "pre-curated, cited" },
    { value: "± 15 %", label: "default CI band", sub: "narrowed by √n" },
  ];
  return (
    <section className="border-border/80 border-b bg-background">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 divide-x divide-border/80 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1 px-6 py-7 first:pl-0 last:pr-0">
              <div className="font-mono text-2xl font-medium tabular-nums text-foreground sm:text-[1.8rem]">
                {s.value}
              </div>
              <div className="text-foreground/85 text-xs font-medium tracking-wide uppercase">
                {s.label}
              </div>
              <div className="text-muted-foreground font-mono text-[10px] tracking-wide">
                {s.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilitiesIndex() {
  const items = [
    {
      no: "01",
      title: "Catalyst retrieval",
      body: "Federated UniProt, KEGG, and BRENDA queries with provenance, deduplication, and live PubMed citations.",
      href: "/articles/retrieving-catalysts",
    },
    {
      no: "02",
      title: "Variant design",
      body: "ESM-2 masked-language-model probes compose five single- and three double-mutant proposals per parent.",
      href: "/articles/designing-variants-with-esm2",
    },
    {
      no: "03",
      title: "Property scoring",
      body: "Activity, thermostability, expression, and yield — each with a 95% confidence interval, never a bare point estimate.",
      href: "/articles/honest-scoring",
    },
    {
      no: "04",
      title: "Bench recalibration",
      body: "Predictions are logged. Outcomes return from the bench. The scoring head recalibrates against your laboratory's data.",
      href: "/articles/closed-loop",
    },
  ];
  return (
    <section id="capabilities" className="bg-utility-bar text-utility-bar-foreground">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
          <div className="md:sticky md:top-28 md:self-start">
            <div className="text-utility-bar-foreground/70 flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
              <span className="bg-highlight inline-block h-[3px] w-7" />
              <span>The laboratory · Capabilities</span>
            </div>
            <h2 className="font-display mt-4 text-[2rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2.4rem]">
              Four capabilities, chained into a single working session.
            </h2>
            <p className="text-utility-bar-foreground/70 mt-5 max-w-md leading-relaxed">
              Each capability is documented with a methods article. The
              pipeline is composable — capabilities can be invoked
              independently or chained end-to-end from substrate query to
              ranked bench shortlist.
            </p>
          </div>
          <ol className="border-utility-bar-foreground/15 flex flex-col border-t">
            {items.map((it) => (
              <li
                key={it.no}
                className="border-utility-bar-foreground/15 border-b"
              >
                <Link
                  href={it.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group hover:bg-utility-bar-foreground/5 grid grid-cols-[auto_1fr_auto] items-baseline gap-6 px-1 py-7 transition-colors"
                >
                  <span className="text-highlight font-mono text-[12px] tracking-[0.2em] tabular-nums">
                    {it.no}
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="font-display group-hover:text-highlight text-[1.35rem] font-semibold tracking-[-0.018em] text-utility-bar-foreground transition-colors">
                      {it.title}
                    </h3>
                    <p className="text-utility-bar-foreground/70 max-w-prose text-[14.5px] leading-relaxed">
                      {it.body}
                    </p>
                  </div>
                  <span className="text-utility-bar-foreground/60 group-hover:text-highlight text-xs font-medium tracking-wide transition-colors">
                    Read note →
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function LatestResearch({ articles }: { articles: Article[] }) {
  if (articles.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.18em] uppercase">
            More from the laboratory
          </p>
          <h2 className="font-display mt-2 text-2xl font-semibold tracking-[-0.018em] sm:text-3xl">
            Latest research notes.
          </h2>
        </div>
        <Link
          href="/articles"
          className="text-accent hidden text-sm font-medium hover:underline underline-offset-4 sm:inline"
        >
          All articles →
        </Link>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </section>
  );
}

function MissionStatement() {
  return (
    <section className="border-border/80 border-y bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-col">
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
            <span className="bg-highlight inline-block h-[3px] w-7" />
            <span>Laboratory mission</span>
          </div>
          <h2 className="font-display mt-4 text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] sm:text-[2.25rem]">
            Computational enzyme engineering, with the bench at the centre.
          </h2>
        </div>
        <div className="text-muted-foreground flex max-w-xl flex-col gap-4 text-[16px] leading-relaxed">
          <p>
            EnzymeForge is a small computational laboratory built for the
            engineering of enzymes that have not yet been engineered for
            industrial use. The pipeline retrieves known catalysts, proposes
            candidate variants, scores their properties honestly, and absorbs
            the lab&rsquo;s own bench data into the scoring model over time.
          </p>
          <p>
            The product is not the prediction. The product is the loop between
            the prediction and the bench. Everything else — the database
            integrations, the model ensembles, the confidence intervals — is
            in service of that loop.
          </p>
          <p className="text-muted-foreground border-border/60 mt-3 border-t pt-4 font-mono text-xs tracking-wide">
            Calibrated against the GPS Renewables programme corpus, since 2026.
          </p>
        </div>
      </div>
    </section>
  );
}

function ClosingNote() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="border-border/80 bg-card rounded-lg border p-10 sm:p-12">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
              <span className="bg-highlight inline-block h-[3px] w-7" />
              <span>Methodology · A note from the team</span>
            </div>
            <h2 className="font-display text-foreground mt-4 text-[1.6rem] font-semibold tracking-[-0.018em] sm:text-2xl">
              Honest about what is computed, and what is heuristic.
            </h2>
            <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
              Hugging Face inference calls hit ESM-2 directly. Database
              queries hit UniProt, KEGG, and BRENDA live. Where the platform
              applies a heuristic, the surface labels it inline. The
              methodology note is the running source of truth.
            </p>
          </div>
          <div className="flex flex-col gap-2 md:items-end">
            <Link
              href="/articles/methodological-disclosure"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Read methodology
            </Link>
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: "lg" }))}
            >
              Start a discovery run
              <ArrowRight />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
