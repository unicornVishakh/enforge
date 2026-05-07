import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · EnzymeForge.ai",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string }>;
}) {
  const params = await searchParams;
  const checkEmail = params.check_email === "1";
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">
          Sign in to your EnzymeForge workspace.
        </p>
      </div>

      {checkEmail && (
        <div className="border-accent/40 bg-accent/10 text-accent-foreground rounded-lg border p-3 text-sm">
          Account created. Check your email to confirm, then sign in below.
        </div>
      )}

      <LoginForm />

      <p className="text-muted-foreground text-center text-sm">
        New to EnzymeForge?{" "}
        <Link
          href="/signup"
          className="text-foreground font-medium hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
