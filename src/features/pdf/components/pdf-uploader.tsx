"use client";

import { FileUp } from "lucide-react";
import { useCallback, useRef, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { validatePdfFile } from "@/features/pdf/lib/pdf-validation";

type PdfUploaderProps = {
  onFile: (file: File) => void;
};

export function PdfUploader({ onFile }: PdfUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      const result = validatePdfFile(file);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onFile(result.file);
    },
    [onFile],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragActive(false);
      acceptFile(event.dataTransfer.files[0]);
    },
    [acceptFile],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-auto">
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload a PDF file"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-14 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              dragActive
                ? "border-primary bg-primary/5"
                : "border-border bg-background",
            )}
          >
            <div className="flex size-12 items-center justify-center rounded-md border border-border bg-muted">
              <FileUp className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-xl font-semibold">Open a PDF</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Drag and drop a PDF here, or click to choose a file. The document
              stays on your device and is never uploaded anywhere.
            </p>
            <Button
              type="button"
              className="mt-6"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
            >
              Choose PDF file
            </Button>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            onChange={(event) => {
              acceptFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {error && (
            <p
              role="alert"
              className="mt-3 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
