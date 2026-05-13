"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    $3Dmol?: {
      createViewer: (
        el: HTMLElement,
        opts?: { backgroundColor?: string; antialias?: boolean },
      ) => Viewer3Dmol;
    };
  }
}

interface Viewer3Dmol {
  addModel: (data: string, format: string) => unknown;
  setStyle: (sel: object, style: object) => void;
  setBackgroundColor: (color: string | number) => void;
  zoomTo: (sel?: object) => void;
  zoom: (factor: number, animationDuration?: number) => void;
  render: () => void;
  spin: (axis?: string, speed?: number) => void;
  addSphere: (opts: object) => unknown;
  removeAllModels: () => void;
}

interface Props {
  pdbId?: string | null;
  highlightPositions?: number[];
  className?: string;
}

const SCRIPT_SRC = "https://3dmol.csb.pitt.edu/build/3Dmol-min.js";

let scriptPromise: Promise<void> | null = null;

function ensure3Dmol(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.$3Dmol) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[src="${SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("3Dmol failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("3Dmol failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function ProteinViewer({
  pdbId,
  highlightPositions,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<Viewer3Dmol | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pdbId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        await ensure3Dmol();
        if (cancelled || !containerRef.current || !window.$3Dmol) return;

        // Clear existing viewer if reusing the container
        containerRef.current.innerHTML = "";

        const viewer = window.$3Dmol.createViewer(containerRef.current, {
          backgroundColor: "rgb(15,15,15)",
          antialias: true,
        });
        viewerRef.current = viewer;

        const pdbResp = await fetch(
          `https://files.rcsb.org/download/${pdbId.toUpperCase()}.pdb`,
        );
        if (!pdbResp.ok) {
          throw new Error(`RCSB returned ${pdbResp.status} for ${pdbId}`);
        }
        const pdbText = await pdbResp.text();
        if (cancelled) return;

        viewer.addModel(pdbText, "pdb");
        viewer.setStyle({}, { cartoon: { color: "spectrum" } });

        if (highlightPositions && highlightPositions.length > 0) {
          for (const pos of highlightPositions) {
            viewer.addSphere({
              center: { resi: pos },
              radius: 1.4,
              color: "rgb(165, 235, 175)",
              opacity: 0.85,
            });
          }
          viewer.setStyle(
            { resi: highlightPositions },
            { stick: { colorscheme: "greenCarbon", radius: 0.25 } },
          );
        }

        viewer.zoomTo();
        viewer.zoom(1.1);
        viewer.render();
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdbId, highlightPositions]);

  if (!pdbId) {
    return (
      <div
        className={
          "border-border/40 bg-muted/20 flex h-[420px] w-full items-center justify-center rounded-xl border border-dashed " +
          (className ?? "")
        }
      >
        <p className="text-muted-foreground max-w-xs text-center text-sm">
          No PDB ID associated with this candidate. Variants inherit the
          parent&apos;s structure when one is available.
        </p>
      </div>
    );
  }

  return (
    <div className={"relative " + (className ?? "")}>
      <div
        ref={containerRef}
        style={{ height: 420, position: "relative" }}
        className="border-border/40 w-full overflow-hidden rounded-xl border bg-black"
      />
      {loading && (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Loader2 className="size-4 animate-spin" />
            Loading {pdbId.toUpperCase()} from RCSB…
          </div>
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/30 absolute inset-x-3 bottom-3 rounded-md border px-3 py-2 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
