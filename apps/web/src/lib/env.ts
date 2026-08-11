export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "RamxWorkspace",
  stage: process.env.NEXT_PUBLIC_APP_STAGE ?? "local",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
} as const;
