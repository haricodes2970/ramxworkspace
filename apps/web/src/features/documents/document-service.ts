import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENTS_BUCKET, buildStoragePath } from "@/lib/supabase/storage";
import { uploadWithProgress } from "@/features/documents/storage-upload";

const GENERIC_UPLOAD_ERROR = "Upload failed. Please try again.";

type UploadResult =
  | { ok: true; documentId: string }
  | { ok: false; error: string };

export async function uploadCloudDocument(
  supabase: NonNullable<SupabaseClient>,
  file: File,
  folderId: string | null,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You need to sign in to upload documents." };
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath(user.id, documentId, file.name);

  try {
    await uploadWithProgress(supabase, storagePath, file, onProgress);
  } catch (uploadError) {
    return {
      ok: false,
      error:
        uploadError instanceof Error &&
        uploadError.name === "StorageUploadError"
          ? uploadError.message
          : GENERIC_UPLOAD_ERROR,
    };
  }

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    user_id: user.id,
    folder_id: folderId,
    name: file.name,
    file_type: "pdf",
    mime_type: "application/pdf",
    size_bytes: file.size,
    storage_path: storagePath,
  });

  if (insertError) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
    return { ok: false, error: GENERIC_UPLOAD_ERROR };
  }

  return { ok: true, documentId };
}

type DeleteResult = { ok: boolean; error?: string };

export async function deleteCloudDocument(
  supabase: NonNullable<SupabaseClient>,
  documentId: string,
): Promise<DeleteResult> {
  const { data: row, error: fetchError } = await supabase
    .from("documents")
    .select("id, name, storage_path")
    .eq("id", documentId)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: "This document is no longer available." };
  }

  if (row.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([row.storage_path]);
    if (storageError) {
      return {
        ok: false,
        error:
          "The document could not be removed from storage. Please try again.",
      };
    }
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", documentId);

  if (deleteError) {
    return {
      ok: false,
      error:
        "The file was removed from storage but its record could not be deleted. Please try again.",
    };
  }

  return { ok: true };
}

export async function moveCloudDocument(
  supabase: NonNullable<SupabaseClient>,
  documentId: string,
  folderId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("documents")
    .update({ folder_id: folderId })
    .eq("id", documentId);

  if (error) {
    return {
      ok: false,
      error: "Could not move the document. Please try again.",
    };
  }
  return { ok: true };
}

export async function renameCloudDocument(
  supabase: NonNullable<SupabaseClient>,
  documentId: string,
  name: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("documents")
    .update({ name })
    .eq("id", documentId);

  if (error) {
    return {
      ok: false,
      error: "Could not rename the document. Please try again.",
    };
  }
  return { ok: true };
}

export async function markDocumentOpened(
  supabase: NonNullable<SupabaseClient>,
  documentId: string,
): Promise<void> {
  await supabase
    .from("documents")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", documentId);
}

export async function downloadCloudDocument(
  supabase: NonNullable<SupabaseClient>,
  row: { name: string; storage_path: string | null },
): Promise<{ ok: boolean; error?: string }> {
  if (!row.storage_path) {
    return { ok: false, error: "This document is no longer available." };
  }

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .download(row.storage_path);

  if (error || !data) {
    return {
      ok: false,
      error: "Could not download the document. Please try again.",
    };
  }

  const url = URL.createObjectURL(data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = row.name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return { ok: true };
}
