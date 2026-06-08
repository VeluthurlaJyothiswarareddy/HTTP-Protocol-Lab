import React from "react";

export default function Card({ title, subtitle, children, className = "", glow }) {
  const glowClass =
    glow === "http1" ? "protocol-glow-http1" : glow === "http2" ? "protocol-glow-http2" : glow === "http3" ? "protocol-glow-http3" : "";

  return (
    <div className={`glass-card p-5 ${glowClass} ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title ? <h3 className="text-sm font-semibold text-slate-200">{title}</h3> : null}
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      )}
      {children}
    </div>
  );
}
