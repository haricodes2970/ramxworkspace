import type { SupabaseClient } from "@supabase/supabase-js";
import type { DocumentMeta, Folder, FolderWithCount } from "@/types/workspace";

export async function getUserFolders(
  supabase: NonNullable<SupabaseClient>,
): Promise<FolderWithCount[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*, documents(count)")
    .order("name", { ascending: true });

  if (error) {
    throw new Error("Could not load folders.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    created_at: row.created_at,
    updated_at: row.updated_at,
    document_count: row.documents?.[0]?.count ?? 0,
  }));
}

export async function getUserDocuments(
  supabase: NonNullable<SupabaseClient>,
): Promise<DocumentMeta[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*, folders(name)")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error("Could not load documents.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    file_type: row.file_type,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    folder_id: row.folder_id,
    folder_name: row.folders?.name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_opened_at: row.last_opened_at,
  }));
}

export async function getRecentDocuments(
  supabase: NonNullable<SupabaseClient>,
  limit = 5,
): Promise<DocumentMeta[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*, folders(name)")
    .order("last_opened_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    throw new Error("Could not load recent documents.");
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    file_type: row.file_type,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    folder_id: row.folder_id,
    folder_name: row.folders?.name ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    last_opened_at: row.last_opened_at,
  }));
}

export async function getFolder(
  supabase: NonNullable<SupabaseClient>,
  folderId: string,
): Promise<{ folder: Folder; documents: DocumentMeta[] } | null> {
  const [folderResult, documentsResult] = await Promise.all([
    supabase.from("folders").select("*").eq("id", folderId).maybeSingle(),
    supabase
      .from("documents")
      .select("*")
      .eq("folder_id", folderId)
      .order("name", { ascending: true }),
  ]);

  if (folderResult.error) {
    throw new Error("Could not load folder.");
  }
  if (!folderResult.data) return null;

  if (documentsResult.error) {
    throw new Error("Could not load folder documents.");
  }

  return {
    folder: folderResult.data,
    documents: documentsResult.data.map((row) => ({
      id: row.id,
      name: row.name,
      file_type: row.file_type,
      mime_type: row.mime_type,
      size_bytes: row.size_bytes,
      folder_id: row.folder_id,
      folder_name: folderResult.data.name,
      created_at: row.created_at,
      updated_at: row.updated_at,
      last_opened_at: row.last_opened_at,
    })),
  };
}
