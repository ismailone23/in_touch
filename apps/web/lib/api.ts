const DEFAULT_API_PORT = "8080";

function normalizeBaseUrl(raw?: string) {
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    return parsed;
  } catch {
    return null;
  }
}

export function getApiBaseUrl() {
  const fromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (fromEnv) {
    return fromEnv.origin;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

export function getWebSocketUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const fromEnv = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);

  if (fromEnv) {
    const wsProtocol = fromEnv.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${fromEnv.host}${normalizedPath}`;
  }

  if (typeof window !== "undefined") {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${wsProtocol}//${window.location.hostname}:${DEFAULT_API_PORT}${normalizedPath}`;
  }

  return `ws://localhost:${DEFAULT_API_PORT}${normalizedPath}`;
}
