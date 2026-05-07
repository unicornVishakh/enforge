import { NewProjectForm } from "./new-project-form";

export const metadata = { title: "New project · EnzymeForge.ai" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          New project
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Define your target reaction
        </h1>
        <p className="text-muted-foreground text-sm">
          Start by naming the project and noting the substrate, product, and
          conditions. We&apos;ll retrieve relevant enzymes from UniProt, KEGG,
          and BRENDA in parallel.
        </p>
      </header>

      <NewProjectForm />
    </div>
  );
}
