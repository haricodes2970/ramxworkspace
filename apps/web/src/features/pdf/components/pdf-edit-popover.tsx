"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PdfEditPopoverProps = {
  originalText: string;
  position: { left: number; top: number };
  onCancel: () => void;
  onApply: (replacementText: string) => Promise<void>;
};

/**
 * Small popover shown after selecting existing PDF text in Edit mode.
 * Displays the original text and collects the replacement. An empty
 * replacement deletes the original text.
 */
export function PdfEditPopover({
  originalText,
  position,
  onCancel,
  onApply,
}: PdfEditPopoverProps) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onApply(value);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The edit could not be applied.",
      );
      setSubmitting(false);
    }
  };

  return (
    <div
      className="absolute z-50 w-80 rounded-lg border border-border bg-background p-3 shadow-lg"
      style={{ left: position.left, top: position.top, pointerEvents: "auto" }}
      role="dialog"
      aria-label="Replace text"
    >
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        Edit text
      </p>
      <p
        className="mb-2 line-clamp-2 rounded bg-muted px-2 py-1 text-xs text-muted-foreground"
        title={originalText}
      >
        {originalText}
      </p>
      <textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            void handleApply();
          }
        }}
        rows={2}
        placeholder="Replacement text (empty deletes)"
        autoFocus
        aria-label="Replacement text"
        className={cn(
          "mb-2 w-full resize-none rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
        )}
      />
      {error && <p className="mb-2 text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={() => void handleApply()}
          disabled={submitting}
        >
          {submitting && <Loader2 className="mr-1 size-3 animate-spin" />}
          {submitting ? "Applying" : "Apply"}
        </Button>
      </div>
    </div>
  );
}
