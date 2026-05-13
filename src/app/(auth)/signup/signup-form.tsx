"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type AuthState } from "../actions";

const initialState: AuthState = { ok: false };

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Researcher"
          aria-invalid={!!state.fieldErrors?.fullName}
        />
        {state.fieldErrors?.fullName && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.fullName}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@lab.org"
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <p className="text-destructive text-xs">{state.fieldErrors.email}</p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          aria-invalid={!!state.fieldErrors?.password}
        />
        <p className="text-muted-foreground text-xs">At least 8 characters.</p>
        {state.fieldErrors?.password && (
          <p className="text-destructive text-xs">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      {state.message && (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded-md border px-3 py-2 text-xs">
          {state.message}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create your workspace"}
      </Button>

      <p className="text-muted-foreground text-center text-[12px] leading-relaxed">
        By creating an account you agree to the{" "}
        <Link
          href="/articles/methodological-disclosure"
          className="text-foreground underline underline-offset-2 hover:no-underline"
        >
          methodology disclosure
        </Link>{" "}
        and to receive low-volume programme updates.
      </p>
    </form>
  );
}
