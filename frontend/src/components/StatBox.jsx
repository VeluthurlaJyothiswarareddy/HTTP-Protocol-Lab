import React from "react";

export default function StatBox({ label, value, unit, tone = "text-white", icon }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-slate-900/40 p-4 transition-colors hover:border-white/10">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        {icon ? <span className="text-slate-500">{icon}</span> : null}
      </div>
      <div className={`mt-2 stat-value ${tone}`}>
        {value ?? "—"}
        {unit && value != null ? <span className="ml-1 text-base font-medium text-slate-400">{unit}</span> : null}
      </div>
    </div>
  );
}
