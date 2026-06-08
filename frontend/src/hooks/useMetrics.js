import { useEffect, useState } from "react";
import { getBaseUrl, getJSON, PROTOCOL_CONFIG } from "../services/api.js";

/**
 * Poll /api/status and /api/metrics for a given protocol.
 * Kept as a reusable hook for the lab dashboard.
 */
export function useMetrics(protocol) {
  const [data, setData] = useState({ status: null, metrics: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const base = getBaseUrl(protocol);
        const [status, metrics] = await Promise.all([
          getJSON(protocol, "/api/status"),
          getJSON(protocol, "/api/metrics"),
        ]);
        if (!cancelled) setData({ status, metrics, error: null });
      } catch (e) {
        if (!cancelled) setData((prev) => ({ ...prev, error: e?.message ?? String(e) }));
      }
    }

    tick();
    const t = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [protocol]);

  return data;
}

