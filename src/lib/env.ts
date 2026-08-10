export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "RamxWorkspace",
  stage: process.env.NEXT_PUBLIC_APP_STAGE ?? "local",
} as const;
