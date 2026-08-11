import Link from "next/link";
import { AuthFormShell } from "@/features/auth/auth-form-shell";
import { SignupForm } from "@/features/auth/signup-form";

export default function SignupPage() {
  const emailRedirectTo =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000"}`;

  return (
    <AuthFormShell
      title="Create your account"
      description="Your documents, folders and workspace — all in one private place."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm emailRedirectTo={`${emailRedirectTo}/auth/callback`} />
    </AuthFormShell>
  );
}
