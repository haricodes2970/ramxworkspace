"use client";

import { useEffect, useRef } from "react";
import { setPdfOpenHandler } from "@/features/pdf/lib/pdf-open";

type PdfHiddenFileInputProps = {
  onFile: (file: File) => void;
};

export function PdfHiddenFileInput({ onFile }: PdfHiddenFileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPdfOpenHandler(() => inputRef.current?.click());
    return () => setPdfOpenHandler(null);
  }, []);

  return (
    <input
      ref={inputRef}
      type="file"
      accept="application/pdf,.pdf"
      className="sr-only"
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onFile(file);
      }}
    />
  );
}
