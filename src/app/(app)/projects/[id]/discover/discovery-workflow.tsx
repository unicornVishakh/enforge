"use client";

import { useMemo, useState } from "react";
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
import {
  PredictStep,
  type PredictableCandidate,
  type PredictionRow,
} from "@/components/discovery/predict-step";

interface Props {
  projectId: string;
  substrate: string;
  product: string;
  initialCandidates: unknown;
  parents: ParentCandidate[];
  initialVariants: GeneratedVariant[];
  predictables: PredictableCandidate[];
  initialPredictions: PredictionRow[];
}

export function DiscoveryWorkflow({
  projectId,
  substrate,
  product,
  initialCandidates,
  parents,
  initialVariants,
  predictables,
  initialPredictions,
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
  const hasPredictions = initialPredictions.length > 0;

  const [currentKey, setCurrentKey] = useState<DiscoverStep["key"]>(
    hasPredictions ? "predict" : hasGenerated ? "generate" : "retrieve",
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
      subtitle: hasPredictions
        ? `${initialPredictions.length} scored`
        : "Activity, stability, yield",
      status: hasPredictions
        ? "complete"
        : hasGenerated || hasRetrieved
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
        <PredictStep
          projectId={projectId}
          candidates={predictables}
          initialPredictions={initialPredictions}
        />
      )}
    </div>
  );
}
