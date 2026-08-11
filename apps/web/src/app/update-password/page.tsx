import Link from "next/link";
import { AuthFormShell } from "@/features/auth/auth-form-shell";
import { UpdatePasswordForm } from "@/features/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthFormShell
      title="Set a new password"
      description="Choose a new password for your account."
      footer={
        <>
          Changed your mind?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <UpdatePasswordForm />
    </AuthFormShell>
  );
}
