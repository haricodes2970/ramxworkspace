const DEFAULT_MAX_UPLOAD_MB = 25;

function parseMaxUploadBytes(): number {
  const raw = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
  }
  return Math.round(raw * 1024 * 1024);
}

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "RamSpace",
  stage: process.env.NEXT_PUBLIC_APP_STAGE ?? "local",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  maxUploadBytes: parseMaxUploadBytes(),
} as const;
