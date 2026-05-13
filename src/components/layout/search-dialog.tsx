"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search as SearchIcon, X } from "lucide-react";
import {
  type Article,
  CATEGORY_LABELS,
  getArticles,
} from "@/content/articles";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Hit {
  article: Article;
  score: number;
}

function score(article: Article, terms: string[]): number {
  if (terms.length === 0) return 0;
  const hay = [
    article.title,
    article.subtitle,
    article.byline,
    article.categoryLabel,
    article.affiliation,
  ]
    .join(" • ")
    .toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!t) continue;
    if (article.title.toLowerCase().includes(t)) s += 6;
    if (article.subtitle.toLowerCase().includes(t)) s += 3;
    if (hay.includes(t)) s += 1;
  }
  return s;
}

export function SearchDialog({ open, onOpenChange }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const articles = useMemo(() => getArticles(), []);

  const hits = useMemo<Hit[]>(() => {
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (terms.length === 0) {
      return articles.slice(0, 6).map((a) => ({ article: a, score: 0 }));
    }
    return articles
      .map((a) => ({ article: a, score: score(a, terms) }))
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [articles, q]);

  // Reset state + focus when opened
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, hits.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        const h = hits[active];
        if (h) {
          window.location.href = `/articles/${h.article.slug}`;
          onOpenChange(false);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hits, active, onOpenChange]);

  // Lock scroll when open
  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Close search"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0 bg-foreground/15 supports-backdrop-filter:backdrop-blur-sm"
      />
      <div className="relative mx-auto mt-[8vh] flex max-w-2xl flex-col px-4">
        <div className="border-border/80 bg-card overflow-hidden rounded-lg border shadow-[0_24px_60px_-24px_oklch(0.18_0.045_258_/_0.45)]">
          <div className="border-border/80 flex items-center gap-3 border-b px-4 py-3">
            <SearchIcon className="text-muted-foreground size-4" />
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setActive(0);
              }}
              placeholder="Search the laboratory — methods, programme, perspectives…"
              className="text-foreground placeholder:text-muted-foreground/80 flex-1 bg-transparent text-[15px] outline-none"
              aria-label="Search articles"
            />
            <kbd className="text-muted-foreground border-border/80 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide sm:inline-block">
              Esc
            </kbd>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground inline-flex size-7 items-center justify-center rounded-md"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Heading row */}
          <div className="text-muted-foreground border-border/80 flex items-center justify-between border-b px-4 py-2 font-mono text-[10px] tracking-[0.18em] uppercase">
            <span>{q ? "Matches" : "Recent articles"}</span>
            <span className="tabular-nums">{hits.length} result{hits.length === 1 ? "" : "s"}</span>
          </div>

          {hits.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Nothing matched <span className="text-foreground font-medium">&ldquo;{q}&rdquo;</span>.
              </p>
              <p className="text-muted-foreground/70 mt-2 text-xs">
                Try a category (methods, programme, perspective, disclosure) or
                a sequence keyword (ESM-2, calibration, UniProt).
              </p>
            </div>
          ) : (
            <ul role="listbox" className="max-h-[55vh] overflow-y-auto py-1">
              {hits.map((h, i) => (
                <li key={h.article.slug}>
                  <Link
                    href={`/articles/${h.article.slug}`}
                    onClick={() => onOpenChange(false)}
                    onMouseEnter={() => setActive(i)}
                    role="option"
                    aria-selected={i === active}
                    className={cn(
                      "group grid grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3 transition-colors",
                      i === active ? "bg-muted/70" : "hover:bg-muted/40",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-[10.5px] tracking-[0.18em] uppercase",
                        i === active ? "text-highlight" : "text-muted-foreground",
                      )}
                    >
                      {CATEGORY_LABELS[h.article.category]}
                    </span>
                    <div className="min-w-0">
                      <div className="text-foreground line-clamp-1 text-[14px] font-semibold tracking-[-0.01em]">
                        {h.article.title}
                      </div>
                      <div className="text-muted-foreground line-clamp-1 text-[12.5px]">
                        {h.article.subtitle.replace(/<[^>]+>/g, "")}
                      </div>
                    </div>
                    <ArrowRight
                      className={cn(
                        "size-3.5 transition-opacity",
                        i === active ? "text-foreground opacity-100" : "opacity-0",
                      )}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="border-border/80 text-muted-foreground flex items-center justify-between gap-3 border-t bg-card/60 px-4 py-2.5 font-mono text-[10.5px] tracking-wide">
            <span>
              <kbd className="border-border/80 mr-1 rounded border px-1.5 py-0.5">↑</kbd>
              <kbd className="border-border/80 mr-1 rounded border px-1.5 py-0.5">↓</kbd>
              navigate
            </span>
            <span>
              <kbd className="border-border/80 mr-1 rounded border px-1.5 py-0.5">↵</kbd>
              open
            </span>
            <span className="hidden sm:inline">
              <kbd className="border-border/80 mr-1 rounded border px-1.5 py-0.5">⌘K</kbd>
              search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
