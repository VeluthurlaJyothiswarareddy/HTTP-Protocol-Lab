import React from "react";
import MetricCard from "./MetricCard.jsx";
import ProtocolBadge from "./ProtocolBadge.jsx";

const GLOW_CLASS = {
  http1: "protocol-glow-http1",
  http2: "protocol-glow-http2",
  http3: "protocol-glow-http3",
};

export default function ProtocolCard({ protocol, status, lastMetrics, colorClass, online }) {
  const isOnline = online ?? status != null;
  const accent = protocol.id;
  const glowClass = GLOW_CLASS[protocol.id] ?? "";

  return (
    <div className={`glass-card-hover p-5 ${glowClass}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <ProtocolBadge protocol={protocol.id} />
          <div className={`text-sm font-medium ${colorClass}`}>
            {lastMetrics?.avg_server_processing_time_ms != null
              ? `${lastMetrics.avg_server_processing_time_ms.toFixed(1)} ms avg`
              : "Awaiting data"}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${
              isOnline ? "bg-emerald-500/15 text-emerald-300" : "bg-slate-500/15 text-slate-400"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
            {isOnline ? "Online" : "Offline"}
          </span>
          <span className="text-xs text-slate-500">{status?.total_requests ?? 0} requests</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricCard
          title="P50 latency"
          value={
            lastMetrics?.p50_server_processing_time_ms != null
              ? `${lastMetrics.p50_server_processing_time_ms.toFixed(1)}`
              : null
          }
          subvalue="ms · server"
          accent={accent}
        />
        <MetricCard
          title="Uptime"
          value={status?.uptime_seconds != null ? Math.floor(status.uptime_seconds) : null}
          subvalue="seconds"
          accent={accent}
        />
      </div>
    </div>
  );
}
