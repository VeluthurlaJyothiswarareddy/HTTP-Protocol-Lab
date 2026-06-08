import React, { useState } from "react";
import ProtocolBadge from "./ProtocolBadge.jsx";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "◈" },
  { id: "ping", label: "Ping Test", icon: "◎" },
  { id: "latency", label: "Latency", icon: "⧖" },
  { id: "load", label: "Load Test", icon: "⚡" },
  { id: "large", label: "Large Payload", icon: "▣" },
  { id: "comparison", label: "Comparison", icon: "⇌" },
  { id: "stream", label: "Streaming", icon: "≋" },
];

export default function Sidebar({
  activePage,
  setActivePage,
  activeProtocol,
  setActiveProtocol,
  protocols,
  mobileOpen,
  setMobileOpen,
}) {
  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.06] bg-slate-900/95 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="border-b border-white/[0.06] p-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-blue-500/20 to-red-500/20 ring-1 ring-white/10">
              <span className="text-lg font-bold text-white">H3</span>
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-widest text-slate-500">Protocol Lab</div>
              <div className="text-sm font-bold text-white">HTTP Benchmark</div>
            </div>
          </div>
        </div>

        {/* Protocol selector */}
        <div className="border-b border-white/[0.06] p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Active Protocol</div>
          <div className="flex flex-col gap-2">
            {protocols.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProtocol(p.id)}
                className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
                  activeProtocol === p.id
                    ? `${p.badge} border-current font-semibold`
                    : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <span>{p.label}</span>
                {activeProtocol === p.id ? <span className="text-xs opacity-70">●</span> : null}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Experiments</div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => {
                    setActivePage(item.id);
                    setMobileOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                    activePage === item.id
                      ? "bg-white/10 font-semibold text-white shadow-inner"
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <span className="w-5 text-center text-base opacity-70">{item.icon}</span>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer status */}
        <div className="border-t border-white/[0.06] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">Selected</span>
            <ProtocolBadge protocol={activeProtocol} pulse />
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader({ setMobileOpen, activePage }) {
  const current = NAV_ITEMS.find((n) => n.id === activePage);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.06] bg-slate-900/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      <button
        onClick={() => setMobileOpen(true)}
        className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5"
        aria-label="Open menu"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <span className="text-sm font-semibold text-white">{current?.label ?? "Dashboard"}</span>
      <div className="w-9" />
    </header>
  );
}
