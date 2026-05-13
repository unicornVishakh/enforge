"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/**
 * One-shot client component mounted on the discover page. Reads
 * `?compare_error=` from the URL; if present, toasts an appropriate message
 * and strips the param via router.replace so a refresh doesn't re-fire.
 *
 * Returns null — no visible DOM.
 */
export function CompareErrorToast() {
  const router = useRouter();
  const sp = useSearchParams();

  useEffect(() => {
    const err = sp.get("compare_error");
    if (!err) return;

    switch (err) {
      case "too_few":
        toast.error("Select at least 2 candidates to compare.");
        break;
      case "none_found":
        toast.error("None of the selected candidates could be loaded.");
        break;
      default:
        toast.error("Could not open compare view.");
    }

    // Strip the flag so refresh doesn't re-fire and history stays clean.
    const next = new URLSearchParams(sp.toString());
    next.delete("compare_error");
    const qs = next.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }, [sp, router]);

  return null;
}
