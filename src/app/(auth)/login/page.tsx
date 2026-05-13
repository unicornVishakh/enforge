import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign in · EnzymeForge",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ check_email?: string }>;
}) {
  const params = await searchParams;
  const checkEmail = params.check_email === "1";
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
          <span className="bg-highlight inline-block size-1.5 rounded-full" />
          Workspace · Sign in
        </div>
        <h1 className="font-display text-foreground text-[1.8rem] font-semibold tracking-[-0.022em]">
          Sign in to your laboratory
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Pick up where you left off. Your projects, predictions, and the
          experiment log are where you left them.
        </p>
      </div>

      {checkEmail && (
        <div className="border-accent/30 bg-accent/8 text-foreground rounded-md border px-3 py-2.5 text-sm">
          Account created. Check your email to confirm, then sign in below.
        </div>
      )}

      <LoginForm />

      <p className="text-muted-foreground border-border/60 border-t pt-5 text-center text-sm">
        New here?{" "}
        <Link
          href="/signup"
          className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
