import React from "react";

export default function CodeBlock({ data }) {
  return (
    <pre className="overflow-auto rounded-xl border border-white/[0.06] bg-slate-950/60 p-4 font-mono text-xs leading-relaxed text-emerald-200/90">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
