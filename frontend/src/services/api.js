export const PROTOCOL_CONFIG = {
  http1: { label: "HTTP/1.1", baseUrl: "http://localhost:8000", color: "text-red-400" },
  http2: { label: "HTTP/2", baseUrl: "https://localhost:8443", color: "text-blue-400" },
  http3: { label: "HTTP/3", baseUrl: "https://localhost:8443", color: "text-emerald-400" },
};

export function getBaseUrl(protocol) {
  return PROTOCOL_CONFIG[protocol]?.baseUrl ?? PROTOCOL_CONFIG.http3.baseUrl;
}

export async function getJSON(protocol, path) {
  const res = await fetch(`${getBaseUrl(protocol)}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request failed: ${res.status} ${res.statusText}. ${text}`);
  }

  return res.json();
}

export async function getStreamNdjson(protocol, path, options = {}) {
  const res = await fetch(`${getBaseUrl(protocol)}${path}`, {
    method: "GET",
    headers: { Accept: "application/x-ndjson" },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Stream failed: ${res.status} ${res.statusText}. ${text}`);
  }

  return res.body;
}

export async function downloadLargePayload(protocol) {
  const res = await fetch(`${getBaseUrl(protocol)}/api/large-payload`, {
    method: "GET",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Download failed: ${res.status} ${res.statusText}. ${text}`);
  }

  const contentLength = res.headers.get("content-length");
  const totalBytes = contentLength ? Number(contentLength) : undefined;
  return { res, totalBytes };
}

