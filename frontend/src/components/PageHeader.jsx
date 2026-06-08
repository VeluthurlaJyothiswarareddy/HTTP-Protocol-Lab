import React from "react";
import ProtocolBadge from "./ProtocolBadge.jsx";

export default function PageHeader({ title, description, activeProtocol, children }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-relaxed text-slate-400">{description}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {activeProtocol ? <ProtocolBadge protocol={activeProtocol} size="lg" /> : null}
        {children}
      </div>
    </div>
  );
}
