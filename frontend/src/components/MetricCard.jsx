import React from "react";

export default function MetricCard({ title, value, subvalue, tone = "text-white", accent }) {
  const accentBorder =
    accent === "http1"
      ? "border-l-red-500/60"
      : accent === "http2"
        ? "border-l-blue-500/60"
        : accent === "http3"
          ? "border-l-emerald-500/60"
          : "border-l-slate-500/40";

  return (
    <div className={`rounded-xl border border-white/[0.06] border-l-2 ${accentBorder} bg-slate-900/50 p-4`}>
      <div className="stat-label">{title}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${tone}`}>{value ?? "—"}</div>
      {subvalue ? <div className="mt-1 text-xs text-slate-500">{subvalue}</div> : null}
    </div>
  );
}
