import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

type Col = { title: string; links: { label: string; href: string }[] };

const COLS: Col[] = [
  {
    title: "Research",
    links: [
      { label: "Methods", href: "/articles?category=methods" },
      { label: "Programme briefs", href: "/articles?category=programme" },
      { label: "Perspectives", href: "/articles?category=perspective" },
      { label: "Disclosures", href: "/articles?category=disclosure" },
    ],
  },
  {
    title: "Capabilities",
    links: [
      { label: "Catalyst retrieval", href: "/articles/retrieving-catalysts" },
      { label: "Variant design", href: "/articles/designing-variants-with-esm2" },
      { label: "Property prediction", href: "/articles/honest-scoring" },
      { label: "Bench recalibration", href: "/articles/closed-loop" },
    ],
  },
  {
    title: "Workspace",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/signup" },
      { label: "Programme overview", href: "/articles/ethanol-to-jet-brief" },
      { label: "Methodology", href: "/articles/methodological-disclosure" },
    ],
  },
  {
    title: "Engage",
    links: [
      { label: "Contact", href: "mailto:hello@enzymeforge.lab" },
      { label: "Programme", href: "/articles/ethanol-to-jet-brief" },
      { label: "Privacy", href: "/articles/methodological-disclosure" },
      { label: "Terms", href: "/articles/methodological-disclosure" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-border/80 mt-24 border-t bg-card/40">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2">
              <LogoMark className="size-6" />
              <span className="font-display text-foreground text-base font-semibold tracking-tight">
                EnzymeForge
              </span>
            </Link>
            <p className="text-muted-foreground text-[13px] leading-relaxed">
              A computational enzyme engineering laboratory for sustainable
              chemistry. Calibrated against bench data, not generic benchmarks.
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <div className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
                {col.title}
              </div>
              <ul className="flex flex-col gap-1.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-foreground/85 hover:text-foreground text-[13.5px] hover:underline underline-offset-4"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-border/60 mt-12 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-[12.5px]">
            © <span className="font-mono">2026</span> EnzymeForge — Built with the
            GPS Renewables programme. All rights reserved.
          </p>
          <p className="text-muted-foreground/80 font-mono text-[11px] tracking-wide">
            v1.0.0-rc · build calibrated 2026-05-13
          </p>
        </div>
      </div>
    </footer>
  );
}
