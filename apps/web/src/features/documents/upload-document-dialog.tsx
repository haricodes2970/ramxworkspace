"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Folder } from "@/types/workspace";
import { uploadCloudDocument } from "@/features/documents/document-service";
import {
  formatBytes,
  validateCloudPdfFile,
} from "@/features/documents/pdf-upload-validation";

type UploadDocumentDialogProps = {
  folders?: Folder[];
  defaultFolderId?: string | null;
  triggerLabel?: string;
};

type UploadPhase = "idle" | "uploading" | "uploaded" | "error";

export function UploadDocumentDialog({
  folders = [],
  defaultFolderId = null,
  triggerLabel = "Upload PDF",
}: UploadDocumentDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [folderId, setFolderId] = useState<string>(defaultFolderId ?? "");
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setFile(null);
    setFolderId(defaultFolderId ?? "");
    setPhase("idle");
    setProgress(0);
    setError(null);
    setDragActive(false);
  };

  const acceptFile = useCallback((candidate: File | undefined) => {
    if (!candidate) return;
    const result = validateCloudPdfFile(candidate);
    if (!result.ok) {
      setFile(null);
      setPhase("error");
      setError(result.error);
      return;
    }
    setFile(result.file);
    setPhase("idle");
    setError(null);
  }, []);

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      acceptFile(event.dataTransfer.files[0]);
    },
    [acceptFile],
  );

  const handleUpload = async () => {
    if (!file || phase === "uploading") return;
    setPhase("uploading");
    setError(null);
    setProgress(0);

    try {
      const supabase = createClient();
      if (!supabase) {
        setPhase("error");
        setError("Cloud storage is not configured yet.");
        return;
      }

      const result = await uploadCloudDocument(
        supabase,
        file,
        folderId || null,
        setProgress,
      );

      if (!result.ok) {
        setPhase("error");
        setError(result.error);
        return;
      }

      setPhase("uploaded");
      setProgress(100);
      router.refresh();
      window.setTimeout(() => {
        setOpen(false);
        reset();
      }, 900);
    } catch {
      setPhase("error");
      setError("Upload failed. Please try again.");
    }
  };

  const uploading = phase === "uploading";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (uploading && !next) return;
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <UploadCloud className="size-4" aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a PDF</DialogTitle>
          <DialogDescription>
            The file is stored privately in your cloud workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Choose a PDF file to upload"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!uploading) setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              uploading && "pointer-events-none opacity-60",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-background",
            )}
          >
            {file ? (
              <>
                <FileText
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-2 max-w-full truncate text-sm font-medium">
                  {file.name}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(file.size)}
                </p>
              </>
            ) : (
              <>
                <UploadCloud
                  className="size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag and drop a PDF here, or click to choose a file.
                </p>
              </>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={handleInput}
          />

          {folders.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="upload-folder">Folder</Label>
              <select
                id="upload-folder"
                value={folderId}
                onChange={(event) => setFolderId(event.target.value)}
                disabled={uploading}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {uploading && (
            <div
              role="progressbar"
              aria-label="Upload progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="flex flex-col gap-1.5"
            >
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Uploading… {progress}%
              </p>
            </div>
          )}

          {phase === "uploaded" && (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Uploaded to your cloud workspace.
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading && (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            )}
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
