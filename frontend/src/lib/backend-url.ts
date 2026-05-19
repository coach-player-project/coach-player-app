/** URL backendu widziany z serwera Next.js (Docker: http://backend:8000). */
export function getServerBackendUrl(): string {
  const raw =
    process.env.API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

/** URL backendu w przeglądarce użytkownika. */
export function getClientBackendUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export function buildBackendApiUrl(base: string, endpoint: string): string {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const normalized = path.startsWith("/api/") ? path : `/api${path}`;
  return `${base}${normalized}`;
}
