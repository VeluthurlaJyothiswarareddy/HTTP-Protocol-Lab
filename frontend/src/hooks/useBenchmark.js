import { useCallback, useState } from "react";
import { getJSON } from "../services/api.js";

/**
 * Lightweight benchmark runner:
 * runs N concurrent /api/delay requests and collects latency + failure counts.
 */
export function useBenchmark() {
  const [state, setState] = useState({
    loading: false,
    error: null,
    result: null,
  });

  const run = useCallback(async ({ protocol, requestCount, delayMs }) => {
    setState({ loading: true, error: null, result: null });

    const latencies = [];
    let success = 0;
    let failed = 0;

    const startAll = performance.now();

    const tasks = Array.from({ length: requestCount }, async () => {
      const t0 = performance.now();
      try {
        await getJSON(protocol, `/api/delay/${delayMs}`);
        const ms = performance.now() - t0;
        latencies.push(ms);
        success += 1;
      } catch {
        failed += 1;
      }
    });

    const outcomes = await Promise.all(tasks);
    const endAll = performance.now();
    const totalDurationMs = endAll - startAll;

    const sorted = [...latencies].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)] : null;
    const avg = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null;

    const throughputRps = totalDurationMs > 0 ? success / (totalDurationMs / 1000) : null;

    setState({
      loading: false,
      error: null,
      result: {
        requestCount,
        delayMs,
        successCount: success,
        failedCount: failed,
        totalDurationMs,
        avgLatencyMs: avg,
        p95LatencyMs: p95,
        throughputRps,
        outcomes,
      },
    });
  }, []);

  return { ...state, run };
}

