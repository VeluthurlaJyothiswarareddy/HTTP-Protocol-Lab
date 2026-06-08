import React, { useMemo } from "react";
import Card from "./Card.jsx";

export default function NetworkDiagram({ activeProtocol }) {
  const config = useMemo(() => {
    if (activeProtocol === "http1")
      return { tone: "text-red-400", dot: "bg-red-400", bg: "from-red-500/20", label: "TCP", streams: 1 };
    if (activeProtocol === "http2")
      return { tone: "text-blue-400", dot: "bg-blue-400", bg: "from-blue-500/20", label: "TLS + TCP", streams: 4 };
    return { tone: "text-emerald-400", dot: "bg-emerald-400", bg: "from-emerald-500/20", label: "QUIC / UDP", streams: 7 };
  }, [activeProtocol]);

  return (
    <Card title="Network Flow" subtitle="Live transport visualization">
      <div className="relative overflow-hidden rounded-xl border border-white/[0.06] bg-slate-950/40 p-6">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          {/* Client */}
          <div className={`rounded-xl border border-white/10 bg-gradient-to-br ${config.bg} to-transparent p-5 text-center`}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 ring-2 ring-white/10">
              <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-xs text-slate-500">Client</div>
            <div className={`font-semibold ${config.tone}`}>Browser</div>
          </div>

          {/* Transport */}
          <div className="flex flex-col items-center gap-2 px-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">{config.label}</span>
            <div className="relative flex h-2 w-24 items-center">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-30 ${config.tone}`} />
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className={`absolute h-2 w-2 rounded-full ${config.dot}`}
                  style={{
                    animation: "packetFlow 1.5s ease-in-out infinite",
                    animationDelay: `${i * 0.5}s`,
                    left: 0,
                  }}
                />
              ))}
            </div>
            <div className="flex gap-1">
              {Array.from({ length: config.streams }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${config.dot} opacity-60`}
                  style={{ animation: "streamPulse 1.2s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>

          {/* Server */}
          <div className={`rounded-xl border border-white/10 bg-gradient-to-br ${config.bg} to-transparent p-5 text-center`}>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-800 ring-2 ring-white/10">
              <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <div className="text-xs text-slate-500">Backend</div>
            <div className={`font-semibold ${config.tone}`}>FastAPI</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes packetFlow {
          0% { left: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { left: calc(100% - 8px); opacity: 0; }
        }
        @keyframes streamPulse {
          0%, 100% { opacity: 0.3; transform: scaleX(0.8); }
          50% { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
    </Card>
  );
}
