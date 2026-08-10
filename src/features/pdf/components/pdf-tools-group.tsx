"use client";

import {
  Highlighter,
  MousePointer2,
  Pen,
  Strikethrough,
  Underline,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import type { AnnotationTool } from "@/features/pdf/types/annotation";

type ToolButtonProps = {
  tool: AnnotationTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
};

function ToolButton({ tool, label, icon: Icon, shortcut }: ToolButtonProps) {
  const activeTool = useAnnotationStore((state) => state.activeTool);
  const setTool = useAnnotationStore((state) => state.setTool);
  const active = activeTool === tool;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={label}
          aria-pressed={active}
          onClick={() => setTool(tool)}
        >
          <Icon className="size-4" aria-hidden="true" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut ? ` (${shortcut})` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

export function PdfToolsGroup() {
  return (
    <div
      className="flex items-center gap-0.5 rounded-lg border border-border bg-background p-0.5"
      role="group"
      aria-label="Annotation tools"
    >
      <ToolButton tool="select" label="Select" icon={MousePointer2} />
      <ToolButton tool="highlight" label="Highlight" icon={Highlighter} />
      <ToolButton tool="underline" label="Underline" icon={Underline} />
      <ToolButton tool="strikeout" label="Strike through" icon={Strikethrough} />
      <ToolButton tool="pen" label="Pen" icon={Pen} />
    </div>
  );
}
