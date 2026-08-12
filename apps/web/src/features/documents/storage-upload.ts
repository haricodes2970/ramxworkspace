import type { SupabaseClient } from "@supabase/supabase-js";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/storage";

export class StorageUploadError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StorageUploadError";
    this.code = code;
  }
}

export async function uploadWithProgress(
  supabase: NonNullable<SupabaseClient>,
  path: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    throw new StorageUploadError("unauthenticated", "You need to sign in.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new StorageUploadError(
      "configuration",
      "Cloud storage is not configured yet.",
    );
  }

  const url = `${supabaseUrl}/storage/v1/object/${DOCUMENTS_BUCKET}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", supabaseKey);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let message = "Upload failed. Please try again.";
      try {
        const body = JSON.parse(xhr.responseText) as {
          statusCode?: number;
          message?: string;
        };
        if (typeof body.message === "string") message = body.message;
      } catch {
        // non-JSON error body; keep the generic message
      }
      if (xhr.status === 401 || xhr.status === 403) {
        reject(
          new StorageUploadError(
            "permission",
            "You need to sign in to upload documents.",
          ),
        );
        return;
      }
      reject(new StorageUploadError("storage", message));
    };

    xhr.onerror = () => {
      reject(
        new StorageUploadError("network", "Upload failed. Please try again."),
      );
    };
    xhr.onabort = () => {
      reject(new StorageUploadError("aborted", "Upload was cancelled."));
    };

    xhr.send(file);
  });
}
