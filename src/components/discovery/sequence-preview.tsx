"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SequenceBlock } from "./primitives";

interface Props {
  sequence: string;
  highlight: number[];
  /** Number of aa to show when collapsed. Default 80. */
  previewLength?: number;
}

/**
 * Sequence display with a "Show full sequence" inline accordion. Renders the
 * first `previewLength` residues by default. Reuses SequenceBlock for the
 * actual rendering — only difference between collapsed and expanded is the
 * slice of sequence passed in.
 */
export function SequencePreview({ sequence, highlight, previewLength = 80 }: Props) {
  const [open, setOpen] = useState(false);
  const showFull = open || sequence.length <= previewLength;
  const shown = showFull ? sequence : sequence.slice(0, previewLength);
  // Highlights are 1-indexed positions on the original sequence; only keep the
  // ones that fall within the visible slice.
  const shownHighlights = highlight.filter((p) => p <= shown.length);

  return (
    <div className="space-y-2">
      <SequenceBlock sequence={shown} highlight={shownHighlights} />
      {sequence.length > previewLength && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase transition-colors"
        >
          {open ? (
            <>
              <ChevronDown className="size-3" />
              Show preview only
            </>
          ) : (
            <>
              <ChevronRight className="size-3" />
              Show full sequence ({sequence.length} aa)
            </>
          )}
        </button>
      )}
    </div>
  );
}
