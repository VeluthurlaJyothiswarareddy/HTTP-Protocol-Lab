import React, { useState } from "react";
import { getJSON } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import StatBox from "../components/StatBox.jsx";
import CodeBlock from "../components/CodeBlock.jsx";

const OPTIONS = [100, 500, 1000, 2000];

export default function LatencySimulator({ activeProtocol }) {
  const [milliseconds, setMilliseconds] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await getJSON(activeProtocol, `/api/delay/${milliseconds}`);
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
        title="Latency Simulator"
        description="Inject artificial server-side delay and compare expected vs actual round-trip time."
        activeProtocol={activeProtocol}
      />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="stat-label">Artificial delay</label>
            <select
              value={milliseconds}
              onChange={(e) => setMilliseconds(Number(e.target.value))}
              className="input-field mt-2 min-w-[160px]"
              disabled={loading}
            >
              {OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v} ms
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary" onClick={run} disabled={loading}>
            {loading ? "Running…" : "Run Simulation"}
          </button>
        </div>

        {result ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <StatBox label="Protocol" value={result.protocol} />
            <StatBox label="Expected" value={result.expected_delay_ms} unit="ms" tone="text-blue-300" />
            <StatBox
              label="Actual"
              value={result.actual_delay_ms?.toFixed(1)}
              unit="ms"
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
