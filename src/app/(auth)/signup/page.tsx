import Link from "next/link";
import { SignupForm } from "./signup-form";

export const metadata = {
  title: "Create account · EnzymeForge.ai",
};

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="text-muted-foreground text-sm">
          Free for academic research. No credit card required.
        </p>
      </div>

      <SignupForm />

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
