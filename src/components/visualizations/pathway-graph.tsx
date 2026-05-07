"use client";

import { useEffect, useRef } from "react";
import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import type { PathwayGraph } from "@/lib/scoring/pathway";

interface Props {
  graph: PathwayGraph;
  className?: string;
  onEdgeClick?: (edgeId: string) => void;
}

/**
 * Cytoscape pathway visualization. Avoids react-cytoscapejs's build issues
 * with Next.js 16 + React 19 by binding to the DOM directly via a ref.
 */
export function PathwayGraphView({ graph, className, onEdgeClick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const elements: ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          isSubstrate: n.is_substrate ?? false,
          isProduct: n.is_product ?? false,
        },
      })),
      ...graph.edges.map((e) => ({
        data: {
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.ec_number ? `EC ${e.ec_number}` : "?",
          activity: e.best_candidate_activity ?? 0.4,
          isBottleneck: e.is_bottleneck,
        },
      })),
    ];

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: "breadthfirst",
        directed: true,
        spacingFactor: 1.4,
        padding: 24,
      },
      style: [
        {
          selector: "node",
          style: {
            "background-color": "oklch(0.18 0 0)",
            "border-color": "oklch(0.27 0 0)",
            "border-width": 1,
            color: "oklch(0.985 0 0)",
            "font-size": 11,
            "font-family": "var(--font-sans)",
            "text-valign": "center",
            "text-halign": "center",
            "text-wrap": "wrap",
            "text-max-width": "120",
            label: "data(label)",
            shape: "round-rectangle",
            width: "label",
            height: 36,
            padding: "10",
          },
        },
        {
          selector: "node[?isSubstrate]",
          style: {
            "background-color": "oklch(0.235 0.05 245)",
            "border-color": "oklch(0.65 0.21 245)",
          },
        },
        {
          selector: "node[?isProduct]",
          style: {
            "background-color": "oklch(0.235 0.05 152)",
            "border-color": "oklch(0.65 0.18 152)",
          },
        },
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": (e: { data: (k: string) => number }) =>
              activityColor(e.data("activity")),
            "target-arrow-color": (e: { data: (k: string) => number }) =>
              activityColor(e.data("activity")),
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            label: "data(label)",
            "font-size": 9,
            "font-family": "var(--font-mono)",
            color: "oklch(0.708 0 0)",
            "text-rotation": "autorotate",
            "text-margin-y": -8,
          },
        },
        {
          selector: "edge[?isBottleneck]",
          style: {
            width: 4,
            "line-color": "oklch(0.55 0.22 25)",
            "target-arrow-color": "oklch(0.55 0.22 25)",
            "line-style": "solid",
          },
        },
      ],
      wheelSensitivity: 0.2,
      minZoom: 0.4,
      maxZoom: 2.5,
    });

    cy.on("tap", "edge", (evt) => {
      const id = evt.target.id();
      onEdgeClick?.(id);
    });

    cyRef.current = cy;
    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [graph, onEdgeClick]);

  return (
    <div
      ref={containerRef}
      className={
        "border-border/40 w-full overflow-hidden rounded-xl border bg-black " +
        (className ?? "")
      }
      style={{ height: 460 }}
    />
  );
}

function activityColor(a: number): string {
  // Red → green gradient mapped through chroma in oklch.
  // a=0 → red (oklch 0.55 0.22 25), a=1 → green (oklch 0.65 0.18 152)
  const clamped = Math.max(0, Math.min(1, a));
  const L = 0.55 + clamped * 0.1;
  const C = 0.22 - clamped * 0.04;
  const H = 25 + clamped * (152 - 25);
  return `oklch(${L.toFixed(2)} ${C.toFixed(2)} ${H.toFixed(0)})`;
}
