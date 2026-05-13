"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  resize: () => void;
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
      existing.addEventListener("error", () =>
        reject(new Error("3Dmol failed to load")),
      );
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

// Resolve once the element has non-zero rendered dimensions. The 3Dmol
// canvas is initialised against the container's current size — if that
// size is 0×0 (e.g. inside a hidden tab panel) the canvas comes up blank
// and the viewer never recovers. Waiting for a real size before init,
// and resizing on subsequent changes, fixes both cases.
function waitForSize(el: HTMLElement): Promise<void> {
  if (el.clientWidth > 0 && el.clientHeight > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const obs = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(el);
  });
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

  const init = useCallback(
    async (cancelledRef: { current: boolean }) => {
      const container = containerRef.current;
      if (!container || !pdbId) return;

      setLoading(true);
      setError(null);
      try {
        await ensure3Dmol();
        if (cancelledRef.current) return;
        await waitForSize(container);
        if (cancelledRef.current || !window.$3Dmol) return;

        container.innerHTML = "";

        const viewer = window.$3Dmol.createViewer(container, {
          backgroundColor: "rgb(250, 251, 252)",
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
        if (cancelledRef.current) return;

        viewer.addModel(pdbText, "pdb");
        viewer.setStyle({}, { cartoon: { color: "spectrum" } });

        if (highlightPositions && highlightPositions.length > 0) {
          for (const pos of highlightPositions) {
            viewer.addSphere({
              center: { resi: pos },
              radius: 1.4,
              color: "rgb(180, 120, 35)",
              opacity: 0.85,
            });
          }
          viewer.setStyle(
            { resi: highlightPositions },
            { stick: { colorscheme: "orangeCarbon", radius: 0.28 } },
          );
        }

        viewer.zoomTo();
        viewer.zoom(1.1);
        viewer.resize();
        viewer.render();
      } catch (e) {
        if (!cancelledRef.current) setError((e as Error).message);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    },
    [pdbId, highlightPositions],
  );

  useEffect(() => {
    if (!pdbId) return;
    const cancelled = { current: false };
    init(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [pdbId, init]);

  // Keep the canvas sized to the container — handles the tab-switch case
  // where the panel was hidden when the viewer first initialised.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const v = viewerRef.current;
      if (v && el.clientWidth > 0 && el.clientHeight > 0) {
        v.resize();
        v.render();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  if (!pdbId) {
    return (
      <div
        className={
          "border-border/80 bg-card/60 flex h-[420px] w-full items-center justify-center rounded-md border border-dashed " +
          (className ?? "")
        }
      >
        <div className="max-w-xs text-center">
          <p className="text-muted-foreground font-mono text-[10.5px] tracking-[0.2em] uppercase">
            No PDB available
          </p>
          <p className="text-foreground/85 mt-2 text-sm leading-relaxed">
            Variants inherit the parent&rsquo;s structure when one is
            available. This candidate has neither.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={"relative " + (className ?? "")}>
      <div
        ref={containerRef}
        style={{ height: 460, width: "100%", position: "relative" }}
        className="border-border/80 bg-background w-full overflow-hidden rounded-md border"
      />
      {/* Caption strip pinned to the figure */}
      <div className="text-muted-foreground border-border/80 mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-[11.5px]">
        <span className="font-mono tracking-wide uppercase">
          Figure · PDB {pdbId.toUpperCase()} · cartoon, mutated residues
          marked
        </span>
        <span className="font-mono">RCSB · live</span>
      </div>

      {loading && (
        <div className="bg-background/70 absolute inset-x-0 top-0 flex h-[460px] items-center justify-center rounded-md backdrop-blur-sm">
          <div className="text-muted-foreground flex flex-col items-center gap-2 text-xs">
            <span className="bg-highlight inline-block h-[3px] w-7 animate-pulse" />
            <span className="font-mono tracking-[0.16em] uppercase">
              Loading {pdbId.toUpperCase()} from RCSB
            </span>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-destructive/10 text-destructive border-destructive/30 absolute inset-x-3 bottom-12 rounded-md border px-3 py-2 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
