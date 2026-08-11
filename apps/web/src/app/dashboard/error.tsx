"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error", error);
  }, [error]);

  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-background px-6 py-10 text-center">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Your workspace could not be loaded. Please try again.
        </p>
        <Button type="button" onClick={reset} className="mt-2">
          Try again
        </Button>
      </div>
    </div>
  );
}
