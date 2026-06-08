import React from "react";

const STYLES = {
  http1: {
    label: "HTTP/1.1",
    className: "bg-red-500/15 text-red-300 border-red-500/30",
    dot: "bg-red-400",
  },
  http2: {
    label: "HTTP/2",
    className: "bg-blue-500/15 text-blue-300 border-blue-500/30",
    dot: "bg-blue-400",
  },
  http3: {
    label: "HTTP/3",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
};

export default function ProtocolBadge({ protocol, size = "md", pulse = false }) {
  const style = STYLES[protocol] ?? STYLES.http3;
  const sizeClass = size === "lg" ? "px-4 py-2 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-semibold ${style.className} ${sizeClass}`}
    >
      <span className={`h-2 w-2 rounded-full ${style.dot} ${pulse ? "animate-pulse" : ""}`} />
      {style.label}
    </span>
  );
}
