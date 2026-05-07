import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required env var ${name}. Add it to .env.local — see .env.example for instructions.`,
    );
  }
  return v;
}

export function createClient() {
  return createBrowserClient<Database>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
