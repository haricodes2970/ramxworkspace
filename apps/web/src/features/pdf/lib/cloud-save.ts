import {
  buildExportedPdf,
  validateExportedPdf,
} from "@/features/pdf/lib/pdf-export";
import { useAnnotationStore } from "@/features/pdf/store/annotation-store";
import { usePdfPagesStore } from "@/features/pdf/store/pdf-pages-store";
import { usePdfViewerStore } from "@/features/pdf/store/pdf-viewer-store";
import { createClient } from "@/lib/supabase/client";
import { saveCloudDocument } from "@/features/documents/document-service";

export type CloudSaveOutcome = "ok" | "stale" | "error";

/**
 * Generates the edited PDF with the same engine as export (annotations
 * flattened, page operations applied), validates it, and replaces the
 * cloud document on its existing storage path. Owns the save state in the
 * viewer store. Returns "stale" without touching the cloud when the
 * document's updated_at changed since it was opened — the caller decides
 * whether to ask the user for confirmation and retry with force.
 */
export async function runCloudSave(force = false): Promise<CloudSaveOutcome> {
  const viewer = usePdfViewerStore.getState();
  if (viewer.saving) return "error";
  if (!viewer.cloudDocumentId || viewer.source !== "cloud") return "error";

  usePdfViewerStore.getState().setSaving(true);

  try {
    const sourceBytes = usePdfViewerStore.getState().sourceBytes;
    const pages = usePdfPagesStore.getState().pages;
    const annotations = useAnnotationStore.getState().annotations;
    const { cloudDocumentId, cloudUpdatedAt } = usePdfViewerStore.getState();

    if (!sourceBytes || pages.length === 0 || !cloudDocumentId) {
      usePdfViewerStore.getState().setSaveFeedback("error");
      usePdfViewerStore
        .getState()
        .setSaveError("The document is no longer available to save.");
      return "error";
    }

    const result = await buildExportedPdf(sourceBytes, pages, annotations);
    await validateExportedPdf(result.bytes, result.pageCount, result.rotations);

    const supabase = createClient();
    if (!supabase) {
      usePdfViewerStore.getState().setSaveFeedback("error");
      usePdfViewerStore
        .getState()
        .setSaveError("Cloud storage is not configured yet.");
      return "error";
    }

    const saveResult = await saveCloudDocument(
      supabase,
      cloudDocumentId,
      result.bytes,
      {
        expectedUpdatedAt: cloudUpdatedAt,
        force,
      },
    );

    if (!saveResult.ok) {
      if (saveResult.code === "stale") {
        return "stale";
      }
      usePdfViewerStore.getState().setSaveFeedback("error");
      usePdfViewerStore.getState().setSaveError(saveResult.error);
      return "error";
    }

    usePdfViewerStore.getState().markClean();
    return "ok";
  } catch (caught) {
    console.error("Cloud save failed", caught);
    usePdfViewerStore.getState().setSaveFeedback("error");
    usePdfViewerStore
      .getState()
      .setSaveError("Save failed. Your existing cloud document was preserved.");
    return "error";
  } finally {
    usePdfViewerStore.getState().setSaving(false);
  }
}
