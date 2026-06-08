import React, { useEffect, useState } from "react";
import ProtocolCard from "../components/ProtocolCard.jsx";
import LatencyChart from "../components/LatencyChart.jsx";
import ThroughputChart from "../components/ThroughputChart.jsx";
import NetworkDiagram from "../components/NetworkDiagram.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Card from "../components/Card.jsx";
import { getBaseUrl, PROTOCOL_CONFIG } from "../services/api.js";

async function safeJSON(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

const EDU_CARDS = [
  {
    title: "HTTP/1.1",
    color: "text-red-400",
    body: "Request/response over TCP. Simple, but limited multiplexing — often one in-flight request per connection, hurting latency under load.",
  },
  {
    title: "HTTP/2",
    color: "text-blue-400",
    body: "Multiplexed streams over a single TCP connection. Better throughput, but TCP head-of-line blocking still affects all streams on packet loss.",
  },
  {
    title: "HTTP/3",
    color: "text-emerald-400",
    body: "HTTP over QUIC (UDP). Stream-level independence eliminates TCP HOL blocking. Faster handshakes and better mobile performance.",
  },
  {
    title: "Why QUIC?",
    color: "text-amber-400",
    body: "Adopted by Google, Meta, and Netflix for reduced latency, faster reconnects, native encryption, and resilience on lossy networks.",
  },
];

export default function Dashboard({ activeProtocol }) {
  const [protocolState, setProtocolState] = useState({
    http1: { status: null, metrics: null },
    http2: { status: null, metrics: null },
    http3: { status: null, metrics: null },
  });
  const [loading, setLoading] = useState(false);
  const [latencySeries, setLatencySeries] = useState([]);
  const [throughputSeries, setThroughputSeries] = useState([]);

  async function refreshOnce() {
    setLoading(true);
    const entries = await Promise.allSettled(
      Object.keys(PROTOCOL_CONFIG).map(async (protocol) => {
        const base = getBaseUrl(protocol);
        const [status, metrics] = await Promise.all([
          safeJSON(`${base}/api/status`),
          safeJSON(`${base}/api/metrics`),
        ]);
        return [protocol, status, metrics];
      }),
    );

    setProtocolState((prev) => {
      const next = { ...prev };
      for (const item of entries) {
        if (item.status === "fulfilled") {
          const [protocol, status, metrics] = item.value;
          next[protocol] = { status, metrics };
        }
      }
      return next;
    });
    setLoading(false);
  }

  useEffect(() => {
    refreshOnce();
    const t = setInterval(refreshOnce, 2000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const base = getBaseUrl(activeProtocol);
        const t0 = performance.now();
        await safeJSON(`${base}/api/ping`);
        const latencyMs = performance.now() - t0;
        if (!cancelled) setLatencySeries((s) => [...s.slice(-29), { t: Date.now(), latencyMs }]);
      } catch {
        // ignore
      }
    }
    const t = setInterval(tick, 1500);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeProtocol]);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const base = getBaseUrl(activeProtocol);
        const res = await fetch(`${base}/api/concurrent`, { headers: { Accept: "application/json" } });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled)
          setThroughputSeries((s) => [...s.slice(-29), { t: Date.now(), throughputRps: json.throughput_rps ?? 0 }]);
      } catch {
        // ignore
      }
    }
    const t = setInterval(tick, 8000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [activeProtocol]);

  const cards = [
    { id: "http1", label: "HTTP/1.1", color: "text-red-400" },
    { id: "http2", label: "HTTP/2", color: "text-blue-400" },
    { id: "http3", label: "HTTP/3", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Monitor backend health and live metrics across HTTP/1.1, HTTP/2, and HTTP/3 (QUIC) protocol servers."
        activeProtocol={activeProtocol}
      >
        <span className="text-xs text-slate-500">{loading ? "Refreshing…" : "Live · 2s interval"}</span>
      </PageHeader>

      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200/90">
        <strong className="font-semibold">TLS note:</strong> HTTP/2 and HTTP/3 require a trusted certificate for{" "}
        <code className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-xs">localhost:8443</code>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <ProtocolCard
            key={c.id}
            protocol={{ id: c.id, label: c.label }}
            status={protocolState[c.id].status}
            lastMetrics={protocolState[c.id].metrics}
            colorClass={c.color}
            online={protocolState[c.id].status != null}
          />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <LatencyChart data={latencySeries} height={280} />
        <ThroughputChart data={throughputSeries} height={280} />
      </div>

      <NetworkDiagram activeProtocol={activeProtocol} />

      <Card title="Protocol Education" subtitle="Understanding the evolution of HTTP">
        <div className="grid gap-4 md:grid-cols-2">
          {EDU_CARDS.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-white/[0.06] bg-slate-900/30 p-4 transition-colors hover:border-white/10"
            >
              <h4 className={`font-semibold ${card.color}`}>{card.title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{card.body}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
