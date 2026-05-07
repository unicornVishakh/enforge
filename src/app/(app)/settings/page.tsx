import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/app/(auth)/actions";
import type { Profile } from "@/lib/types/database";

export const metadata = { title: "Settings · EnzymeForge.ai" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();
  const p = profile as Profile | null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-8">
      <header className="space-y-1">
        <p className="text-accent font-mono text-xs tracking-[0.2em] uppercase">
          Settings
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Profile & account
        </h1>
      </header>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Profile</h2>
        <dl className="mt-4 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{p?.full_name ?? "—"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="font-mono text-xs">{user?.email}</dd>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="capitalize">{p?.role ?? "researcher"}</dd>
          <dt className="text-muted-foreground">User ID</dt>
          <dd className="text-muted-foreground font-mono text-[10px]">
            {user?.id}
          </dd>
        </dl>
      </Card>

      <Card className="p-6">
        <h2 className="text-base font-semibold">Session</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Signing out will end your session on this device.
        </p>
        <form action={signOutAction} className="mt-4">
          <Button variant="destructive" type="submit">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </Card>
    </div>
  );
}
