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
import {
  GenerateStep,
  type ParentCandidate,
  type GeneratedVariant,
} from "@/components/discovery/generate-step";
import { Card } from "@/components/ui/card";

interface Props {
  projectId: string;
  substrate: string;
  product: string;
  initialCandidates: unknown;
  parents: ParentCandidate[];
  initialVariants: GeneratedVariant[];
  hasPredictions: boolean;
}

export function DiscoveryWorkflow({
  projectId,
  substrate,
  product,
  initialCandidates,
  parents,
  initialVariants,
  hasPredictions,
}: Props) {
  const initial: InitialRetrievalState = useMemo(
    () => ({
      candidates: (initialCandidates as InitialRetrievalState["candidates"]) ?? [],
      literature: [],
    }),
    [initialCandidates],
  );

  const hasRetrieved = initial.candidates.length > 0;
  const hasGenerated = initialVariants.length > 0;

  const [currentKey, setCurrentKey] = useState<DiscoverStep["key"]>(
    hasGenerated ? "generate" : "retrieve",
  );

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
      subtitle: hasGenerated
        ? `${initialVariants.length} variants`
        : "ESM-2 mutation scoring",
      status: hasGenerated ? "complete" : hasRetrieved ? "active" : "locked",
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
        <GenerateStep
          projectId={projectId}
          parents={parents}
          initialVariants={initialVariants}
          onAdvance={() => setCurrentKey("predict")}
        />
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
