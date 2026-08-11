import { appConfig } from "@/lib/env";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${appConfig.apiUrl}${path}`, init);
  if (!response.ok) {
    throw new ApiError(
      `API request failed: ${response.status}`,
      response.status,
    );
  }
  return (await response.json()) as T;
}

export interface HealthResponse {
  status: string;
}

export function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/health");
}
