import Link from "next/link";
import { AuthFormShell } from "@/features/auth/auth-form-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost:3000"}`;

  return (
    <AuthFormShell
      title="Reset your password"
      description="Enter your account email and we'll send you a reset link."
      footer={
        <>
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm redirectTo={`${siteUrl}/update-password`} />
    </AuthFormShell>
  );
}
