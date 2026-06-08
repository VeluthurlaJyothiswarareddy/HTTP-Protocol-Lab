import React, { useState } from "react";
import { getJSON } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import StatBox from "../components/StatBox.jsx";
import CodeBlock from "../components/CodeBlock.jsx";

export default function PingTest({ activeProtocol }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [latencyMs, setLatencyMs] = useState(null);
  const [error, setError] = useState(null);

  async function onPing() {
    setLoading(true);
    setError(null);
    try {
      const t0 = performance.now();
      const json = await getJSON(activeProtocol, "/api/ping");
      setLatencyMs(performance.now() - t0);
      setResult(json);
    } catch (e) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ping Test"
        description="Send a single request to /api/ping and measure end-to-end round-trip latency."
        activeProtocol={activeProtocol}
      />

      <Card>
        <button className="btn-primary" onClick={onPing} disabled={loading}>
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Sending…
            </>
          ) : (
            "Send Ping"
          )}
        </button>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatBox label="Protocol" value={result?.protocol} tone="text-slate-200" />
          <StatBox
            label="Latency"
            value={latencyMs != null ? latencyMs.toFixed(1) : null}
            unit="ms"
            tone="text-emerald-300"
          />
          <StatBox label="Response" value={result?.message} tone="text-blue-300" />
        </div>

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
