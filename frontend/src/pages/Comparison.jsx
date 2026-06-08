import React, { useState } from "react";
import { getBaseUrl, PROTOCOL_CONFIG, getJSON } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import ProtocolBadge from "../components/ProtocolBadge.jsx";

async function downloadLargeAndMeasure(protocol) {
  const t0 = performance.now();
  const res = await fetch(`${getBaseUrl(protocol)}/api/large-payload`);
  if (!res.ok) throw new Error(`${protocol} large-payload failed`);
  const buf = await res.arrayBuffer();
  const durationMs = performance.now() - t0;
  return { throughputMBps: buf.byteLength / (1024 * 1024) / (durationMs / 1000), durationMs, bytes: buf.byteLength };
}

async function concurrentDelays(protocol, requestCount, delayMs) {
  const latencies = [];
  let success = 0;
  let failed = 0;
  const startAll = performance.now();

  await Promise.all(
    Array.from({ length: requestCount }, async () => {
      const t0 = performance.now();
      try {
        await getJSON(protocol, `/api/delay/${delayMs}`);
        latencies.push(performance.now() - t0);
        success += 1;
      } catch {
        failed += 1;
      }
    }),
  );

  const durationMs = performance.now() - startAll;
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    success,
    failed,
    durationMs,
    avgLatencyMs: latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null,
    p95LatencyMs: sorted.length ? sorted[Math.max(0, Math.floor(sorted.length * 0.95) - 1)] : null,
    throughputRps: durationMs > 0 ? success / (durationMs / 1000) : null,
  };
}

async function measureHeadOfLine(protocol, delayMs) {
  const base = getBaseUrl(protocol);
  const t0 = performance.now();
  const delayPromise = getJSON(protocol, `/api/delay/${delayMs}`);
  await fetch(`${base}/api/large-payload`).then((r) => r.arrayBuffer());
  await delayPromise;
  return { completedInMs: performance.now() - t0 };
}

const ROWS = [
  { key: "connection", label: "Connection Setup", fmt: (v) => `${v?.toFixed(1)} ms` },
  { key: "latency", label: "Latency (actual)", fmt: (v) => `${v?.toFixed(1)} ms` },
  { key: "throughput", label: "Throughput (5 MB)", fmt: (v) => `${v?.toFixed(2)} MiB/s` },
  { key: "multiplex", label: "Concurrent RPS", fmt: (v) => `${v?.toFixed(2)} rps` },
  { key: "hol", label: "HOL Blocking", fmt: (v) => `${v?.toFixed(1)} ms` },
  { key: "concurrent", label: "Success / Failed", fmt: (v) => v },
];

export default function Comparison() {
  const [loading, setLoading] = useState(false);
  const [loss, setLoss] = useState(10);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function runAll() {
    setLoading(true);
    setError(null);
    setResult(null);

    const delayMs = 200;
    const requestCount = 50;

    try {
      const data = { http1: {}, http2: {}, http3: {} };
      const packetLoss = {};

      for (const p of ["http1", "http2", "http3"]) {
        const t0 = performance.now();
        await getJSON(p, "/api/ping");
        data[p].connection = performance.now() - t0;

        const delayJson = await getJSON(p, `/api/delay/${delayMs}`);
        data[p].latency = delayJson.actual_delay_ms;

        const tp = await downloadLargeAndMeasure(p);
        data[p].throughput = tp.throughputMBps;

        const mx = await concurrentDelays(p, requestCount, delayMs);
        data[p].multiplex = mx.throughputRps;
        data[p].concurrent = `${mx.success} / ${mx.failed}`;

        const hol = await measureHeadOfLine(p, delayMs);
        data[p].hol = hol.completedInMs;

        const res = await fetch(
          `${getBaseUrl(p)}/api/simulated-network?loss=${loss}&delay_ms=${delayMs}&requests=50`,
        );
        packetLoss[p] = await res.json();
      }

      setResult({ loss, delayMs, requestCount, data, packetLoss });
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Protocol Comparison"
        description="Run identical benchmarks across HTTP/1.1, HTTP/2, and HTTP/3 to compare real-world browser performance."
      >
        <div>
          <label className="stat-label">Packet loss</label>
          <select
            value={loss}
            onChange={(e) => setLoss(Number(e.target.value))}
            className="input-field mt-1"
            disabled={loading}
          >
            {[5, 10, 20].map((v) => (
              <option key={v} value={v}>
                {v}% loss
              </option>
            ))}
          </select>
        </div>
      </PageHeader>

      <Card>
        <button className="btn-primary" onClick={runAll} disabled={loading}>
          {loading ? "Benchmarking all protocols…" : "Run Comparison Benchmark"}
        </button>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </Card>

      {result ? (
        <>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-slate-900/50">
                  <th className="p-4 text-left font-semibold text-slate-400">Metric</th>
                  <th className="p-4 text-left font-semibold text-red-300">HTTP/1.1</th>
                  <th className="p-4 text-left font-semibold text-blue-300">HTTP/2</th>
                  <th className="p-4 text-left font-semibold text-emerald-300">HTTP/3</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-slate-300">{row.label}</td>
                    {["http1", "http2", "http3"].map((p) => (
                      <td key={p} className="p-4 font-mono text-slate-100">
                        {row.fmt(result.data[p][row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card title="Packet Loss Simulation" subtitle={`${result.loss}% simulated loss · ${result.requestCount} requests`}>
            <div className="grid gap-4 md:grid-cols-3">
              {["http1", "http2", "http3"].map((p) => {
                const r = result.packetLoss[p];
                return (
                  <div key={p} className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4">
                    <ProtocolBadge protocol={p} />
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Success</div>
                        <div className="font-semibold text-emerald-300">{r.success_count}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Failed</div>
                        <div className="font-semibold text-red-300">{r.failed_count}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-slate-500">Avg latency</div>
                        <div className="font-semibold text-slate-200">
                          {r.avg_latency_ms != null ? `${r.avg_latency_ms.toFixed(1)} ms` : "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
}
