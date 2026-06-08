import React, { useState } from "react";
import { PROTOCOL_CONFIG, getBaseUrl } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import StatBox from "../components/StatBox.jsx";
import CodeBlock from "../components/CodeBlock.jsx";

export default function LargePayloadTest({ activeProtocol }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  async function download() {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const t0 = performance.now();
      const res = await fetch(`${getBaseUrl(activeProtocol)}/api/large-payload`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const contentLength = res.headers.get("content-length");
      const expectedBytes = contentLength ? Number(contentLength) : undefined;
      const buf = await res.arrayBuffer();
      const bytesActual = buf.byteLength;
      const ms = performance.now() - t0;

      setProgress(100);
      setResult({
        protocol: PROTOCOL_CONFIG[activeProtocol].label,
        downloadDurationMs: ms,
        bytesExpected: expectedBytes,
        bytesActual,
        throughputMbps: bytesActual / (1024 * 1024) / (ms / 1000),
      });
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Large Payload Test"
        description="Download a ~5 MB JSON payload and measure transfer duration and throughput."
        activeProtocol={activeProtocol}
      />

      <Card>
        <button className="btn-primary" onClick={download} disabled={loading}>
          {loading ? "Downloading…" : "Download 5 MB Payload"}
        </button>

        {loading ? (
          <div className="mt-6">
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
                style={{ width: `${progress || 30}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Transferring payload…</p>
          </div>
        ) : null}

        {result ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatBox label="Download time" value={result.downloadDurationMs.toFixed(0)} unit="ms" />
            <StatBox
              label="Payload size"
              value={(result.bytesActual / (1024 * 1024)).toFixed(2)}
              unit="MiB"
              tone="text-blue-300"
            />
            <StatBox
              label="Throughput"
              value={result.throughputMbps.toFixed(2)}
              unit="MiB/s"
              tone="text-emerald-300"
            />
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </Card>

      {result ? <CodeBlock data={result} /> : null}
    </div>
  );
}
