"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ConditionsSchema = z.object({
  temperature_celsius: z.coerce.number().min(-50).max(200).optional(),
  ph: z.coerce.number().min(0).max(14).optional(),
  solvent: z.string().max(80).optional(),
  notes: z.string().max(500).optional(),
});

const NewProjectSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  substrate: z.string().trim().min(1, "Substrate is required").max(120),
  product: z.string().trim().min(1, "Product is required").max(120),
  target_reaction: z.string().trim().max(280).optional(),
});

export type NewProjectState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<
    Record<
      "name" | "substrate" | "product" | "target_reaction" | "conditions",
      string
    >
  >;
};

export async function createProjectAction(
  _prev: NewProjectState,
  formData: FormData,
): Promise<NewProjectState> {
  const parsed = NewProjectSchema.safeParse({
    name: formData.get("name"),
    substrate: formData.get("substrate"),
    product: formData.get("product"),
    target_reaction: formData.get("target_reaction") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: NewProjectState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path[0] as keyof NonNullable<
        NewProjectState["fieldErrors"]
      >;
      if (k && !fieldErrors[k]) fieldErrors[k] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const conditions = ConditionsSchema.parse({
    temperature_celsius: formData.get("temperature_celsius") || undefined,
    ph: formData.get("ph") || undefined,
    solvent: (formData.get("solvent") as string)?.trim() || undefined,
    notes: (formData.get("notes") as string)?.trim() || undefined,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Not authenticated" };

  // Use the user's first workspace as the home for new projects.
  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);
  const workspaceId = memberships?.[0]?.workspace_id;
  if (!workspaceId) {
    return {
      ok: false,
      message: "No workspace found. Please contact support.",
    };
  }

  const targetReaction =
    parsed.data.target_reaction ||
    `${parsed.data.substrate} → ${parsed.data.product}`;

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      workspace_id: workspaceId,
      name: parsed.data.name,
      substrate: parsed.data.substrate,
      product: parsed.data.product,
      target_reaction: targetReaction,
      conditions,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !project) {
    return { ok: false, message: error?.message ?? "Failed to create project" };
  }

  // Audit log (non-blocking on failure)
  await supabase.from("audit_log").insert({
    user_id: user.id,
    workspace_id: workspaceId,
    action: "project.created",
    entity_type: "project",
    entity_id: project.id,
    payload: { name: parsed.data.name, target_reaction: targetReaction },
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  redirect(`/projects/${project.id}/discover`);
}
