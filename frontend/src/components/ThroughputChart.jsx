import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur">
      <div className="text-xs text-slate-400">Throughput</div>
      <div className="text-sm font-semibold text-blue-300">{payload[0].value?.toFixed(2)} rps</div>
    </div>
  );
}

export default function ThroughputChart({ data, height = 280 }) {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">Throughput Trend</h3>
          <p className="text-xs text-slate-500">Requests per second over time</p>
        </div>
        <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-medium text-blue-300">rps</span>
      </div>
      <div className="w-full" style={{ height, minHeight: height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="throughputGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="throughputRps"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#throughputGrad)"
              dot={false}
              activeDot={{ r: 4, fill: "#3b82f6", stroke: "#0f172a", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
