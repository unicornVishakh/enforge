import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { Workspace, Profile } from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    redirect("/login?error=missing_env");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, workspacesRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("workspace_members")
      .select("workspace_id, role, workspaces(*)")
      .eq("user_id", user.id),
  ]);

  const profile = (profileRes.data ?? null) as Profile | null;
  const workspaces: Workspace[] = (workspacesRes.data ?? [])
    .map((m) => (m as unknown as { workspaces: Workspace }).workspaces)
    .filter((w): w is Workspace => Boolean(w));

  // The user's "active" workspace defaults to the first they're a member of —
  // typically the personal workspace created at signup.
  const activeWorkspace = workspaces[0] ?? null;

  return (
    <div className="bg-background flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          email={user.email ?? ""}
          fullName={profile?.full_name ?? null}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspace?.id ?? null}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
