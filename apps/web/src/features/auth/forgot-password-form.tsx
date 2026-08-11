"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/features/auth/auth-errors";
import { createClient } from "@/lib/supabase/client";

type ForgotPasswordFormProps = {
  redirectTo: string;
};

export function ForgotPasswordForm({ redirectTo }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication is not configured yet. Try again later.");
        return;
      }
      const { error: authError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (authError) {
        setError(friendlyAuthError(authError));
        return;
      }
      setSent(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
          <MailCheck
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-base font-semibold">Reset link sent</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            If an account exists for <strong>{email}</strong>, you&apos;ll
            receive an email with a link to set a new password.
          </p>
        </div>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-11"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={submitting} className="mt-2 h-11">
        {submitting && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {submitting ? "Sending reset email…" : "Send reset email"}
      </Button>
    </form>
  );
}
