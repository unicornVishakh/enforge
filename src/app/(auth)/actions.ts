"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const SignUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z
    .string()
    .min(1, "Please enter your name")
    .max(120, "Name is too long"),
});

const SignInSchema = z.object({
  email: z.email(),
  password: z.string().min(1, "Password is required"),
});

export type AuthState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"email" | "password" | "fullName", string>>;
};

function fieldErrorsFromZod<T extends z.ZodObject>(
  err: z.ZodError<z.infer<T>>,
): AuthState["fieldErrors"] {
  const out: AuthState["fieldErrors"] = {};
  for (const issue of err.issues) {
    const key = issue.path[0] as keyof NonNullable<AuthState["fieldErrors"]>;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false,
      message:
        "Auth not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to .env.local.",
    };
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) return { ok: false, message: error.message };

  // If email confirmation is OFF in Supabase, a session is returned and we
  // can drop the user straight into the app. If ON, no session yet — bounce
  // to /login with a confirmation note.
  if (!data.session) {
    redirect("/login?check_email=1");
  }
  redirect("/dashboard");
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = SignInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return {
      ok: false,
      message:
        "Auth not configured. Add NEXT_PUBLIC_SUPABASE_URL and ANON_KEY to .env.local.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: error.message };

  redirect("/dashboard");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
