import React, { useMemo, useState } from "react";
import Sidebar, { MobileHeader } from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PingTest from "./pages/PingTest.jsx";
import LoadTest from "./pages/LoadTest.jsx";
import LargePayloadTest from "./pages/LargePayloadTest.jsx";
import Comparison from "./pages/Comparison.jsx";
import StreamingDemo from "./pages/StreamingDemo.jsx";
import LatencySimulator from "./pages/LatencySimulator.jsx";

export default function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const [activeProtocol, setActiveProtocol] = useState("http3");
  const [mobileOpen, setMobileOpen] = useState(false);

  const protocols = useMemo(
    () => [
      { id: "http1", label: "HTTP/1.1", color: "text-red-400", badge: "bg-red-500/20 border-red-500/40 text-red-300" },
      { id: "http2", label: "HTTP/2", color: "text-blue-400", badge: "bg-blue-500/20 border-blue-500/40 text-blue-300" },
      { id: "http3", label: "HTTP/3", color: "text-emerald-400", badge: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" },
    ],
    [],
  );

  const page = (() => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard activeProtocol={activeProtocol} />;
      case "ping":
        return <PingTest activeProtocol={activeProtocol} />;
      case "load":
        return <LoadTest activeProtocol={activeProtocol} />;
      case "large":
        return <LargePayloadTest activeProtocol={activeProtocol} />;
      case "latency":
        return <LatencySimulator activeProtocol={activeProtocol} />;
      case "comparison":
        return <Comparison />;
      case "stream":
        return <StreamingDemo activeProtocol={activeProtocol} />;
      default:
        return <Dashboard activeProtocol={activeProtocol} />;
    }
  })();

  return (
    <div className="mesh-bg grid-pattern min-h-screen">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        activeProtocol={activeProtocol}
        setActiveProtocol={setActiveProtocol}
        protocols={protocols}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <div className="lg:pl-72">
        <MobileHeader setMobileOpen={setMobileOpen} activePage={activePage} />

        <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
          <div key={activePage} className="page-enter">
            {page}
          </div>
        </main>
      </div>
    </div>
  );
}
