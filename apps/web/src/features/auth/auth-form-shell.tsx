import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/layout/theme-toggle";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthFormShell({
  title,
  description,
  children,
  footer,
}: AuthFormShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-sm font-semibold">
            R
          </div>
          <span className="text-sm font-semibold">RamSpace</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-sm">
          <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
            <div className="mb-6 flex flex-col gap-1.5">
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            </div>
            {children}
          </div>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        </div>
      </main>
    </div>
  );
}
