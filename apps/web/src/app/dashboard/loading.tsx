"use client";

import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2
          className="size-6 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Loading workspace…</p>
      </div>
    </div>
  );
}
