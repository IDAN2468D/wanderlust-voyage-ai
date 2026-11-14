const PRODUCTION_API_URL = "https://wanderlust-voyage-ai.onrender.com";
const LOCAL_API_URL = "http://localhost:8000";

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Resolves the FastAPI backend base URL safely for client and SSR contexts.
 * Prevents accidentally baking "http://localhost:8000" into Render production bundles
 * when NEXT_PUBLIC_API_URL is not set during Docker build time.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (envUrl) {
    return normalizeBaseUrl(envUrl);
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return LOCAL_API_URL;
    }
    return PRODUCTION_API_URL;
  }

  const internalUrl = process.env.BACKEND_INTERNAL_URL?.trim();
  if (internalUrl) {
    return normalizeBaseUrl(internalUrl);
  }

  return process.env.NODE_ENV === "development" ? LOCAL_API_URL : PRODUCTION_API_URL;
}

/**
 * Resolves the FastAPI backend base URL inside Next.js Route Handlers / Server Components
 * using the incoming request Host header when available.
 */
export function getServerApiBaseUrl(requestHost?: string | null): string {
  const serverUrl =
    process.env.BACKEND_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim();
  if (serverUrl) {
    return normalizeBaseUrl(serverUrl);
  }

  const host = (requestHost || "").toLowerCase();
  if (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    process.env.NODE_ENV === "development"
  ) {
    return LOCAL_API_URL;
  }

  return PRODUCTION_API_URL;
}
