import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Slim utility strip — institutional look */}
      <div className="bg-utility-bar text-utility-bar-foreground hidden md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-[12px]">
          <div className="flex items-center gap-2 font-mono tracking-wide">
            <span className="bg-highlight inline-block size-1.5 rounded-full" />
            <span className="opacity-90">
              EnzymeForge — Computational Enzyme Engineering Laboratory
            </span>
          </div>
          <div className="flex items-center gap-5 opacity-80">
            <Link
              href="/articles/methodological-disclosure"
              className="hover:opacity-100 hover:underline underline-offset-4"
            >
              Methodology
            </Link>
            <Link
              href="/articles"
              className="hover:opacity-100 hover:underline underline-offset-4"
            >
              Articles
            </Link>
          </div>
        </div>
      </div>

      <header className="border-border/80 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center">
            <Logo />
          </Link>
          <div className="text-muted-foreground flex items-center gap-5 text-sm">
            <Link
              href="/articles"
              className="hover:text-foreground hidden font-medium sm:inline"
            >
              Articles
            </Link>
            <Link
              href="/"
              className="hover:text-foreground font-medium"
            >
              Back to the laboratory
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1">
        <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 lg:grid-cols-[1fr_1fr]">
          {/* Form column */}
          <div className="flex items-center justify-center px-6 py-12 sm:py-16">
            <div className="w-full max-w-sm">{children}</div>
          </div>

          {/* Context column */}
          <aside className="bg-card/40 border-border/80 hidden flex-col justify-between border-l px-10 py-16 lg:flex">
            <div className="flex flex-col gap-3">
              <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
                <span className="bg-highlight inline-block size-1.5 rounded-full" />
                Programme · Ethanol-to-jet
              </div>
              <h2 className="font-display text-foreground text-[1.9rem] font-semibold leading-tight tracking-[-0.02em]">
                A computational laboratory for enzymes that have not yet been
                engineered.
              </h2>
              <p className="text-muted-foreground mt-1 max-w-md text-[15px] leading-relaxed">
                EnzymeForge retrieves known catalysts, proposes candidate
                variants with masked language modelling, and scores activity,
                stability, expression, and yield — each with a confidence
                band. Predictions are logged and the scoring head recalibrates
                against your own bench data over time.
              </p>
            </div>

            <div className="border-border/60 my-10 grid grid-cols-2 divide-x divide-border/60 border-y">
              {[
                { v: "31", l: "programme enzymes" },
                { v: "≤ 8 s", l: "p50 variant gen" },
                { v: "± 15 %", l: "default CI band" },
                { v: "v1.0.0-rc", l: "calibration head" },
              ].map((s) => (
                <div key={s.l} className="px-5 py-4 first:pl-0">
                  <div className="font-mono text-xl font-medium tabular-nums">
                    {s.v}
                  </div>
                  <div className="text-muted-foreground mt-1 text-[11.5px] tracking-wide uppercase">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>

            <blockquote className="border-highlight font-display text-foreground border-l-2 pl-5 text-[18px] font-medium leading-snug tracking-[-0.012em]">
              The product is the loop between the prediction and the bench.
              Everything else — the database integrations, the model
              ensembles, the confidence intervals — is in service of that
              loop.
              <footer className="text-muted-foreground mt-3 text-[12.5px] font-normal not-italic tracking-normal">
                From the methodology note
              </footer>
            </blockquote>

            <div className="text-muted-foreground border-border/60 mt-10 flex items-center gap-2 border-t pt-5 text-xs">
              <span className="font-mono tracking-wide">
                ISO 8601 dates · UTC · v1.0.0-rc
              </span>
            </div>
          </aside>
        </div>
      </main>

      <footer className="border-border/80 border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-5 text-xs sm:flex-row">
          <span>
            EnzymeForge · Free for academic research · No credit card required
          </span>
          <div className="flex items-center gap-4">
            <Link
              href="/articles/methodological-disclosure"
              className="hover:text-foreground"
            >
              Methodology
            </Link>
            <Link
              href="/articles"
              className="hover:text-foreground"
            >
              Articles
            </Link>
            <span className="font-mono">v1.0.0-rc</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
