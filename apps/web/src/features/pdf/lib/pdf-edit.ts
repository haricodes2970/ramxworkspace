import { appConfig } from "@/lib/env";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import { TextEditError } from "@/features/pdf/lib/pdf-edit-request";
import type {
  TextEditRect,
  TextEditRequest,
} from "@/features/pdf/lib/pdf-edit-request";

export type { TextEditRect, TextEditRequest };
export { TextEditError } from "@/features/pdf/lib/pdf-edit-request";

/**
 * Send the current source PDF plus an edit request to the RamSpace PDF
 * editing service and return the modified PDF bytes. The original text is
 * genuinely removed from the content stream by the service.
 */
export async function editPdfText(
  sourceBytes: ArrayBuffer,
  request: TextEditRequest,
): Promise<ArrayBuffer> {
  const form = new FormData();
  form.append("file", new Blob([sourceBytes], { type: "application/pdf" }));
  form.append("page", String(request.page));
  form.append("originalText", request.originalText);
  form.append("replacementText", request.replacementText);
  const rect = request.rects[0];
  if (rect) {
    form.append("rectX0", String(rect.x0));
    form.append("rectY0", String(rect.y0));
    form.append("rectX1", String(rect.x1));
    form.append("rectY1", String(rect.y1));
  }

  const response = await fetch(`${appConfig.apiUrl}/pdf/edit-text`, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    let detail = `Edit failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // keep the generic message when the body is not JSON
    }
    throw new TextEditError(detail, response.status);
  }

  return response.arrayBuffer();
}

/**
 * Single undo entry point used by the toolbar and keyboard shortcuts.
 * Text edits undo first (they replace the document bytes), then
 * annotation operations. Returns true when an action was undone.
 */
export function canUndo(): boolean {
  const editHistory = usePdfViewerStore.getState().editHistory;
  if (editHistory.past.length > 0) return true;
  return useAnnotationStore.getState().past.length > 0;
}

export function canRedo(): boolean {
  const editHistory = usePdfViewerStore.getState().editHistory;
  if (editHistory.future.length > 0) return true;
  return useAnnotationStore.getState().future.length > 0;
}

export async function undoAction(): Promise<boolean> {
  const editHistory = usePdfViewerStore.getState().editHistory;
  if (editHistory.past.length > 0) {
    await usePdfViewerStore.getState().undoTextEdit();
    return true;
  }
  useAnnotationStore.getState().undo();
  return false;
}

export async function redoAction(): Promise<boolean> {
  const editHistory = usePdfViewerStore.getState().editHistory;
  if (editHistory.future.length > 0) {
    await usePdfViewerStore.getState().redoTextEdit();
    return true;
  }
  useAnnotationStore.getState().redo();
  return false;
}
