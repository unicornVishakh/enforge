"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronDown, Menu, Search, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonVariants } from "@/components/ui/button";
import { SearchDialog } from "@/components/layout/search-dialog";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string; description?: string };
type NavSection = { title: string; href: string; links: NavLink[] };

const NAV: NavSection[] = [
  {
    title: "Research",
    href: "/articles?category=methods",
    links: [
      {
        label: "Methods",
        href: "/articles?category=methods",
        description: "Retrieval, variant generation, scoring, calibration.",
      },
      {
        label: "Programme briefs",
        href: "/articles?category=programme",
        description: "Ethanol-to-jet enzyme engineering for GPS Renewables.",
      },
      {
        label: "Perspectives",
        href: "/articles?category=perspective",
        description: "Editorial notes from the team.",
      },
      {
        label: "Methodological disclosures",
        href: "/articles?category=disclosure",
        description: "What is computed and what is heuristic.",
      },
    ],
  },
  {
    title: "Articles",
    href: "/articles",
    links: [
      { label: "All articles", href: "/articles" },
      { label: "Latest", href: "/articles?sort=latest" },
      { label: "Most read", href: "/articles?sort=read" },
    ],
  },
  {
    title: "Capabilities",
    href: "/#capabilities",
    links: [
      {
        label: "Catalyst retrieval",
        href: "/articles/retrieving-catalysts",
        description: "Federated queries across UniProt, KEGG, BRENDA.",
      },
      {
        label: "Variant design",
        href: "/articles/designing-variants-with-esm2",
        description: "ESM-2 masked language modelling pipeline.",
      },
      {
        label: "Property prediction",
        href: "/articles/honest-scoring",
        description: "Activity, stability, expression, yield — with CIs.",
      },
      {
        label: "Bench recalibration",
        href: "/articles/closed-loop",
        description: "Versioned models tuned against your lab's data.",
      },
    ],
  },
  {
    title: "About",
    href: "/articles/methodological-disclosure",
    links: [
      { label: "Methodology", href: "/articles/methodological-disclosure" },
      { label: "Programme", href: "/articles/ethanol-to-jet-brief" },
      { label: "Articles", href: "/articles" },
    ],
  },
];

const UTILITY_LINKS: NavLink[] = [
  { label: "Programme", href: "/articles/ethanol-to-jet-brief" },
  { label: "Methodology", href: "/articles/methodological-disclosure" },
  { label: "Articles", href: "/articles" },
];

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  // Cmd/Ctrl+K opens the search overlay site-wide
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      } else if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-background">
      {/* Utility bar */}
      <div className="bg-utility-bar text-utility-bar-foreground hidden md:block">
        <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-[12px]">
          <div className="flex items-center gap-2 font-mono tracking-wide">
            <span className="bg-highlight inline-block size-1.5 rounded-full" />
            <span className="opacity-90">
              EnzymeForge — Computational Enzyme Engineering Laboratory
            </span>
          </div>
          <nav className="flex items-center gap-5">
            {UTILITY_LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="opacity-80 hover:opacity-100 hover:underline underline-offset-4"
              >
                {l.label}
              </Link>
            ))}
            <span aria-hidden className="bg-utility-bar-foreground/30 h-3.5 w-px" />
            <Link
              href="/login"
              className="opacity-90 hover:opacity-100 hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </div>

      {/* Main nav */}
      <div className="border-border/80 border-b bg-background">
        <div className="mx-auto grid h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-8 px-6">
          {/* Left — logo */}
          <div className="flex items-center">
            <Link
              href="/"
              className="flex shrink-0 items-center"
              aria-label="EnzymeForge — home"
            >
              <Logo />
            </Link>
          </div>

          {/* Center — desktop nav */}
          <nav className="hidden items-center justify-center gap-1 lg:flex">
            {NAV.map((section) => (
              <div
                key={section.title}
                className="relative flex"
                onMouseEnter={() => setOpenSection(section.title)}
                onMouseLeave={() => setOpenSection(null)}
              >
                <Link
                  href={section.href}
                  className={cn(
                    "text-foreground/85 hover:text-foreground inline-flex items-center gap-1 rounded px-3.5 py-7 text-[14px] font-medium transition-colors",
                    openSection === section.title && "text-foreground",
                  )}
                >
                  {section.title}
                  <ChevronDown
                    className={cn(
                      "size-3.5 opacity-60 transition-transform",
                      openSection === section.title && "rotate-180",
                    )}
                  />
                </Link>
                {openSection === section.title && (
                  <div className="border-border/80 bg-card absolute top-full left-1/2 z-40 w-80 -translate-x-1/2 rounded-md border shadow-lg">
                    <div className="bg-highlight/60 h-0.5 w-12" />
                    <ul className="p-2">
                      {section.links.map((l) => (
                        <li key={l.label}>
                          <Link
                            href={l.href}
                            className="hover:bg-muted block rounded px-3 py-2.5"
                          >
                            <div className="text-foreground text-sm font-medium">
                              {l.label}
                            </div>
                            {l.description && (
                              <div className="text-muted-foreground mt-0.5 text-xs leading-snug">
                                {l.description}
                              </div>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Right — actions */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              aria-label="Search articles"
              onClick={() => setSearchOpen(true)}
              className="hover:bg-muted text-foreground/80 hidden size-9 items-center justify-center rounded-md transition-colors md:inline-flex"
            >
              <Search className="size-[18px]" />
            </button>
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "default" }),
                "hidden sm:inline-flex",
              )}
            >
              Start a run
              <ArrowRight />
            </Link>
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="hover:bg-muted inline-flex size-9 items-center justify-center rounded-md lg:hidden"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-border/80 border-t lg:hidden">
            <nav className="mx-auto max-w-7xl px-4 py-4">
              <ul className="flex flex-col gap-1">
                {NAV.map((section) => (
                  <li key={section.title}>
                    <details className="group">
                      <summary className="hover:bg-muted flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2.5 text-sm font-medium">
                        {section.title}
                        <ChevronDown className="size-4 opacity-60 transition-transform group-open:rotate-180" />
                      </summary>
                      <ul className="ml-2 flex flex-col gap-0.5 border-l border-border/80 pl-3 py-1">
                        {section.links.map((l) => (
                          <li key={l.label}>
                            <Link
                              href={l.href}
                              onClick={() => setMobileOpen(false)}
                              className="text-muted-foreground hover:text-foreground block px-3 py-1.5 text-sm"
                            >
                              {l.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </li>
                ))}
                <li className="border-border/60 mt-2 flex flex-col gap-2 border-t pt-3">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="hover:bg-muted rounded-md px-3 py-2 text-sm font-medium"
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      buttonVariants({ size: "default" }),
                      "justify-center",
                    )}
                  >
                    Start a run
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}
