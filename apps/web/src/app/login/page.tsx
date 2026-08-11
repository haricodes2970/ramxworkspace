import Link from "next/link";
import { AuthFormShell } from "@/features/auth/auth-form-shell";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <AuthFormShell
      title="Welcome back"
      description="Sign in to your RamSpace account."
      footer={
        <>
          New to RamSpace?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create a free account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthFormShell>
  );
}
