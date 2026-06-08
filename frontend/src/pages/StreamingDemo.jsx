import React, { useRef, useState } from "react";
import { getStreamNdjson } from "../services/api.js";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";

export default function StreamingDemo({ activeProtocol }) {
  const [loading, setLoading] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  async function start() {
    setLoading(true);
    setError(null);
    setChunks([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const stream = await getStreamNdjson(activeProtocol, "/api/stream", { signal: controller.signal });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 1);
          if (!line) continue;
          try {
            setChunks((prev) => [...prev, JSON.parse(line)]);
          } catch {
            // ignore
          }
        }
      }
    } catch (e) {
      const msg = e?.message ?? String(e);
      if (!msg.toLowerCase().includes("abort")) setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Streaming Demo"
        description="Consume NDJSON chunks from /api/stream — one chunk per second over the active protocol."
        activeProtocol={activeProtocol}
      />

      <Card>
        <div className="flex flex-wrap gap-3">
          <button className="btn-primary" onClick={start} disabled={loading}>
            {loading ? "Streaming…" : "Start Stream"}
          </button>
          <button className="btn-secondary" onClick={stop} disabled={!loading}>
            Stop
          </button>
        </div>
        {error ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}
      </Card>

      <Card title={`Incoming Chunks (${chunks.length})`} subtitle="Real-time server-sent data">
        {chunks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 h-12 w-12 animate-pulse rounded-full bg-slate-800 ring-2 ring-white/5" />
            <p className="text-sm text-slate-500">Waiting for stream data…</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chunks.map((c, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-slate-900/40 px-4 py-3 animate-slide-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-sm font-bold text-emerald-300">
                  {c.chunk}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-200">Chunk #{c.chunk}</div>
                  <div className="truncate font-mono text-xs text-slate-500">{c.timestamp}</div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400">
                  {c.protocol}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
