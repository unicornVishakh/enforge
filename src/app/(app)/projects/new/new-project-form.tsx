"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  createProjectAction,
  type NewProjectState,
} from "../actions";

const initialState: NewProjectState = { ok: false };

const SAMPLE_REACTIONS = [
  {
    name: "Ethanol → Jet Fuel (C8-C16)",
    substrate: "ethanol",
    product: "C8-C16 alkanes",
    target: "ethanol → C8-C16 hydrocarbons via fatty-acid biosynthesis",
  },
  {
    name: "CO₂ + H₂ → Methanol",
    substrate: "carbon dioxide",
    product: "methanol",
    target: "CO2 + 3H2 → methanol via formate dehydrogenase pathway",
  },
  {
    name: "Glucose → Lactate",
    substrate: "glucose",
    product: "L-lactate",
    target: "glucose fermentation to L-lactate",
  },
] as const;

export function NewProjectForm() {
  const [state, action, pending] = useActionState(
    createProjectAction,
    initialState,
  );

  return (
    <form action={action} className="space-y-6">
      <Card className="space-y-4 p-6">
        <FieldRow label="Project name" htmlFor="name">
          <Input
            id="name"
            name="name"
            type="text"
            required
            maxLength={120}
            placeholder="Ethanol → Jet Fuel"
            aria-invalid={!!state.fieldErrors?.name}
          />
          {state.fieldErrors?.name && (
            <ErrorText>{state.fieldErrors.name}</ErrorText>
          )}
        </FieldRow>

        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow label="Substrate" htmlFor="substrate">
            <Input
              id="substrate"
              name="substrate"
              type="text"
              required
              maxLength={120}
              placeholder="ethanol"
              aria-invalid={!!state.fieldErrors?.substrate}
            />
            {state.fieldErrors?.substrate && (
              <ErrorText>{state.fieldErrors.substrate}</ErrorText>
            )}
          </FieldRow>
          <FieldRow label="Product" htmlFor="product">
            <Input
              id="product"
              name="product"
              type="text"
              required
              maxLength={120}
              placeholder="C8-C16 alkanes"
              aria-invalid={!!state.fieldErrors?.product}
            />
            {state.fieldErrors?.product && (
              <ErrorText>{state.fieldErrors.product}</ErrorText>
            )}
          </FieldRow>
        </div>

        <FieldRow
          label="Target reaction (optional, free text)"
          htmlFor="target_reaction"
        >
          <Input
            id="target_reaction"
            name="target_reaction"
            type="text"
            maxLength={280}
            placeholder="Auto-filled from substrate → product if blank"
          />
        </FieldRow>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold">Conditions</h2>
          <p className="text-muted-foreground text-xs">
            Optional context — informs scoring and the experimental plan we
            export.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <FieldRow label="Temperature (°C)" htmlFor="temperature_celsius">
            <Input
              id="temperature_celsius"
              name="temperature_celsius"
              type="number"
              step="0.1"
              min="-50"
              max="200"
              placeholder="37"
            />
          </FieldRow>
          <FieldRow label="pH" htmlFor="ph">
            <Input
              id="ph"
              name="ph"
              type="number"
              step="0.1"
              min="0"
              max="14"
              placeholder="7.0"
            />
          </FieldRow>
          <FieldRow label="Solvent" htmlFor="solvent">
            <Input
              id="solvent"
              name="solvent"
              type="text"
              maxLength={80}
              placeholder="aqueous buffer"
            />
          </FieldRow>
        </div>
        <FieldRow label="Notes" htmlFor="notes">
          <Textarea
            id="notes"
            name="notes"
            maxLength={500}
            rows={3}
            placeholder="Any constraints, references, or hypotheses you want recorded with this project."
          />
        </FieldRow>
      </Card>

      {state.message && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs">
          {state.message}
        </div>
      )}

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <details className="text-xs">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors">
            Use a sample target →
          </summary>
          <div className="mt-3 grid gap-2">
            {SAMPLE_REACTIONS.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={(e) => {
                  const form = (e.currentTarget as HTMLButtonElement).form!;
                  (form.elements.namedItem("name") as HTMLInputElement).value =
                    s.name;
                  (
                    form.elements.namedItem("substrate") as HTMLInputElement
                  ).value = s.substrate;
                  (
                    form.elements.namedItem("product") as HTMLInputElement
                  ).value = s.product;
                  (
                    form.elements.namedItem(
                      "target_reaction",
                    ) as HTMLInputElement
                  ).value = s.target;
                }}
                className="border-border/60 hover:border-accent/40 hover:bg-card rounded-md border p-2 text-left text-xs transition-colors"
              >
                <div className="font-medium">{s.name}</div>
                <div className="text-muted-foreground font-mono text-[10px]">
                  {s.substrate} → {s.product}
                </div>
              </button>
            ))}
          </div>
        </details>

        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating…" : "Create & retrieve enzymes"}
          <ArrowRight />
        </Button>
      </div>
    </form>
  );
}

function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-xs">{children}</p>;
}
