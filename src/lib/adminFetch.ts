"use client";

function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)ntv-csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function adminFetch(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const method = (options.method ?? "GET").toUpperCase();
  const isReadOnly = method === "GET" || method === "HEAD";
  const extraHeaders: Record<string, string> = {};
  if (!isReadOnly) {
    const csrf = getCsrfToken();
    if (csrf) extraHeaders["x-csrf-token"] = csrf;
  }
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...extraHeaders,
    },
  });
}
