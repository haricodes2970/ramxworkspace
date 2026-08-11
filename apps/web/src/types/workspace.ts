export type Folder = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type FolderWithCount = Folder & {
  document_count: number;
};

export type DocumentMeta = {
  id: string;
  name: string;
  file_type: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder_id: string | null;
  folder_name: string | null;
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
};
