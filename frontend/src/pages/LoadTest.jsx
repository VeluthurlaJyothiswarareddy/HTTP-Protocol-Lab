import React, { useMemo, useState } from "react";
import { PROTOCOL_CONFIG, getJSON } from "../services/api.js";
import LatencyChart from "../components/LatencyChart.jsx";
import ThroughputChart from "../components/ThroughputChart.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import StatBox from "../components/StatBox.jsx";

function p95(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)];
}

export default function LoadTest({ activeProtocol }) {
  const requestOptions = useMemo(() => [10, 50, 100, 500], []);
  const [requestCount, setRequestCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [latencySeries, setLatencySeries] = useState([]);
  const [throughputSeries, setThroughputSeries] = useState([]);
  const [error, setError] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setLatencySeries([]);
    setThroughputSeries([]);

    const delayMs = 200;
    const latencies = [];
    let success = 0;
    let failed = 0;
    const startAll = performance.now();

    const tasks = Array.from({ length: requestCount }, async () => {
      const t0 = performance.now();
      try {
        await getJSON(activeProtocol, `/api/delay/${delayMs}`);
        latencies.push(performance.now() - t0);
        success += 1;
      } catch {
        failed += 1;
      }
    });

    await Promise.all(tasks);
    const totalDurationMs = performance.now() - startAll;
    const sorted = [...latencies].sort((a, b) => a - b);

    setLatencySeries(sorted.map((ms, idx) => ({ t: idx + 1, latencyMs: ms })));
    setThroughputSeries(
      sorted.map((_, idx) => ({ t: idx + 1, throughputRps: (idx + 1) / (totalDurationMs / 1000) })),
    );

    setResult({
      protocol: PROTOCOL_CONFIG[activeProtocol].label,
      requestCount,
      successCount: success,
      failedCount: failed,
      totalDurationMs,
      avgLatencyMs: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : null,
      p95LatencyMs: p95(sorted),
      throughputRps: success / (totalDurationMs / 1000),
    });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Load Test"
        description="Fire concurrent /api/delay requests and measure success rate, latency distribution, and throughput."
        activeProtocol={activeProtocol}
      />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="stat-label">Concurrent requests</label>
            <select
              value={requestCount}
              onChange={(e) => setRequestCount(Number(e.target.value))}
              className="input-field mt-2 min-w-[160px]"
              disabled={loading}
            >
              {requestOptions.map((n) => (
                <option key={n} value={n}>
                  {n} requests
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run Load Test"}
          </button>
        </div>

        {result ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatBox label="Success" value={result.successCount} tone="text-emerald-300" />
            <StatBox label="Failed" value={result.failedCount} tone="text-red-300" />
            <StatBox label="Total time" value={result.totalDurationMs.toFixed(0)} unit="ms" />
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </Card>

      {result ? (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <LatencyChart data={latencySeries} height={300} />
            <ThroughputChart data={throughputSeries} height={300} />
          </div>

          <Card title="Benchmark Results">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatBox
                label="Avg latency"
                value={result.avgLatencyMs?.toFixed(1)}
                unit="ms"
                tone="text-blue-300"
              />
              <StatBox
                label="P95 latency"
                value={result.p95LatencyMs?.toFixed(1)}
                unit="ms"
                tone="text-amber-300"
              />
              <StatBox
                label="Throughput"
                value={result.throughputRps?.toFixed(2)}
                unit="rps"
                tone="text-emerald-300"
              />
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
