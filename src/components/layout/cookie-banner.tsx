"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ef-cookie-consent";

type Choice = "accepted" | "essential" | null;

export function CookieBanner() {
  const [choice, setChoice] = useState<Choice>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const v = window.localStorage.getItem(STORAGE_KEY) as Choice;
      setChoice(v);
    } catch {
      setChoice(null);
    }
  }, []);

  function record(value: NonNullable<Choice>) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* no-op */
    }
    setChoice(value);
  }

  if (!mounted || choice) return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="border-border/80 bg-card fixed inset-x-0 bottom-0 z-[60] rounded-t-md border-t shadow-[0_-10px_40px_-12px_oklch(0.18_0.045_258_/_0.18)]"
    >
      <div className="bg-highlight h-[3px] w-full" aria-hidden />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-6 py-7 md:flex-row md:items-center md:gap-8 md:py-9">
        <div className="flex flex-1 flex-col gap-2">
          <div className="text-muted-foreground flex items-center gap-2 font-mono text-[10.5px] tracking-[0.22em] uppercase">
            <span>Notice</span>
            <span aria-hidden className="bg-border h-px w-8" />
            <span>Cookie preferences</span>
          </div>
          <h2 className="font-display text-foreground text-[16px] font-semibold tracking-[-0.012em]">
            This laboratory uses cookies.
          </h2>
          <p className="text-muted-foreground max-w-3xl text-[13.5px] leading-relaxed">
            Strictly-essential cookies keep you signed in to your workspace.
            Optional analytics cookies tell us which articles get read. No
            third-party trackers, ever. Read the{" "}
            <Link
              href="/articles/methodological-disclosure"
              className="text-foreground font-medium underline underline-offset-2 hover:no-underline"
            >
              methodology note
            </Link>{" "}
            for the full disclosure.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-nowrap">
          <button
            type="button"
            onClick={() => record("essential")}
            className={cn(
              buttonVariants({ variant: "outline", size: "default" }),
              "justify-center rounded-md",
            )}
          >
            Essential only
          </button>
          <button
            type="button"
            onClick={() => record("accepted")}
            className={cn(
              buttonVariants({ size: "default" }),
              "justify-center rounded-md",
            )}
          >
            Accept all
          </button>
        </div>

        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => record("essential")}
          className="text-muted-foreground hover:text-foreground absolute right-3 top-3 hidden size-7 items-center justify-center rounded-md md:inline-flex"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
