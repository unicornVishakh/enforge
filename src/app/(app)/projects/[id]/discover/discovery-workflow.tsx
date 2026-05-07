"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  DiscoverStepper,
  type DiscoverStep,
} from "@/components/discovery/discover-stepper";
import {
  RetrieveStep,
  type InitialRetrievalState,
} from "@/components/discovery/retrieve-step";
import { Card } from "@/components/ui/card";

interface Props {
  projectId: string;
  substrate: string;
  product: string;
  initialCandidates: unknown;
  hasGenerated: boolean;
  hasPredictions: boolean;
}

export function DiscoveryWorkflow({
  projectId,
  substrate,
  product,
  initialCandidates,
  hasGenerated,
  hasPredictions,
}: Props) {
  const [currentKey, setCurrentKey] = useState<DiscoverStep["key"]>("retrieve");

  const initial: InitialRetrievalState = useMemo(
    () => ({
      candidates: (initialCandidates as InitialRetrievalState["candidates"]) ?? [],
      literature: [],
    }),
    [initialCandidates],
  );

  const hasRetrieved = initial.candidates.length > 0;

  const steps: DiscoverStep[] = [
    {
      key: "retrieve",
      title: "Retrieve",
      subtitle: hasRetrieved
        ? `${initial.candidates.length} candidates`
        : "UniProt · KEGG · BRENDA",
      status: hasRetrieved ? "complete" : "active",
    },
    {
      key: "generate",
      title: "Generate variants",
      subtitle: hasGenerated ? "Variants ready" : "ESM-2 mutation scoring",
      status: hasGenerated
        ? "complete"
        : hasRetrieved
          ? "active"
          : "locked",
    },
    {
      key: "predict",
      title: "Predict & rank",
      subtitle: hasPredictions ? "Scored" : "Activity, stability, yield",
      status: hasPredictions
        ? "complete"
        : hasGenerated
          ? "active"
          : "locked",
    },
  ];

  return (
    <div className="space-y-6">
      <DiscoverStepper
        steps={steps}
        currentKey={currentKey}
        onSelect={(k) => setCurrentKey(k)}
      />

      {currentKey === "retrieve" && (
        <RetrieveStep
          projectId={projectId}
          substrate={substrate}
          product={product}
          initial={initial}
          onAdvance={() => setCurrentKey("generate")}
        />
      )}

      {currentKey === "generate" && (
        <Card className="space-y-3 p-8 text-center">
          <Lock className="text-muted-foreground mx-auto size-6" />
          <h3 className="text-base font-semibold">Step 2 lands in Phase 3</h3>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            Variant generation uses ESM-2 masked-LM scoring against your
            HuggingFace key. This step is wired up next.
          </p>
        </Card>
      )}

      {currentKey === "predict" && (
        <Card className="space-y-3 p-8 text-center">
          <Lock className="text-muted-foreground mx-auto size-6" />
          <h3 className="text-base font-semibold">Step 3 lands in Phase 4</h3>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">
            Activity / stability / expression / yield scoring with confidence
            intervals.
          </p>
        </Card>
      )}
    </div>
  );
}
