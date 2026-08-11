import Link from "next/link";
import { FolderX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FolderNotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4 text-foreground">
      <div className="flex w-full max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-card px-6 py-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
          <FolderX
            className="size-6 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <h1 className="text-lg font-semibold">Folder not found</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          This folder does not exist or you do not have access to it.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
