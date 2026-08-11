import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthFormShell } from "@/features/auth/auth-form-shell";

export default async function AuthConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthFormShell
      title={error ? "Confirmation failed" : "Check your email"}
      description={
        error
          ? "We could not confirm your account with that link. It may be invalid or expired."
          : "A confirmation link is on its way. Open it to activate your account."
      }
      footer={
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
          <MailCheck
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        {error ? (
          <Button asChild className="mt-2 h-11">
            <Link href="/signup">Try signing up again</Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="mt-2 h-11">
            <Link href="/login">Go to sign in</Link>
          </Button>
        )}
      </div>
    </AuthFormShell>
  );
}
