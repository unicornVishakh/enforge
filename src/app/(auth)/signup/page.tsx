import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create account · EnzymeForge",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2.5">
        <div className="text-muted-foreground flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] uppercase">
          <span className="bg-highlight inline-block size-1.5 rounded-full" />
          Workspace · New account
        </div>
        <h1 className="font-display text-foreground text-[1.8rem] font-semibold tracking-[-0.022em]">
          Open a workspace in the laboratory
        </h1>
        <p className="text-muted-foreground text-[15px] leading-relaxed">
          Free for academic research. No credit card required. Collaborators
          can be invited from inside the workspace.
        </p>
      </div>

      <SignupForm />

      <p className="text-muted-foreground border-border/60 border-t pt-5 text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium underline underline-offset-4 hover:no-underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
