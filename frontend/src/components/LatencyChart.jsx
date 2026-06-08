import React from "react";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="text-xs text-slate-400">Sample</div>
      <div className="text-sm font-semibold text-emerald-300">{payload[0].value?.toFixed(1)} ms</div>
    </div>
  );
}

export default function LatencyChart({ data, height = 280 }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Latency Trend</h3>
          <p className="text-xs text-slate-500">Round-trip time over recent samples</p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">ms</span>
      </div>
      <div className="w-full" style={{ height, minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="latencyMs"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#latencyGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#22c55e", stroke: "#0f172a", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
