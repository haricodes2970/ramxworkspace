"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PdfConfirmButtonProps = {
  onConfirm: () => void;
  ariaLabel: string;
  confirmAriaLabel: string;
  children: ReactNode;
  confirmChildren: ReactNode;
  disabled?: boolean;
  className?: string;
};

const CONFIRM_DELAY_MS = 4000;

export function PdfConfirmButton({
  onConfirm,
  ariaLabel,
  confirmAriaLabel,
  children,
  confirmChildren,
  disabled,
  className,
}: PdfConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const disarm = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    setArmed(false);
  };

  const handleClick = () => {
    if (armed) {
      disarm();
      onConfirm();
    } else {
      setArmed(true);
      timerRef.current = window.setTimeout(
        () => setArmed(false),
        CONFIRM_DELAY_MS,
      );
    }
  };

  return (
    <Button
      type="button"
      variant={armed ? "destructive" : "ghost"}
      disabled={disabled}
      aria-label={armed ? confirmAriaLabel : ariaLabel}
      aria-pressed={armed}
      className={cn(className, armed && "border-border")}
      onClick={handleClick}
      onBlur={disarm}
    >
      {armed ? confirmChildren : children}
    </Button>
  );
}
