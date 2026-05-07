import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles email-confirmation and OAuth callbacks. Supabase appends `?code=...`
 * to the redirect URL; we exchange it for a session and bounce into the app.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`);
      }
    } catch {
      // fall through to error redirect
    }
  }

  return NextResponse.redirect(`${origin}/login?error=callback_failed`);
}
