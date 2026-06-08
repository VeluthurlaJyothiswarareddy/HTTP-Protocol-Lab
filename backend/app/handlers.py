from __future__ import annotations

import asyncio
import json
import os
import random
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse

from .metrics_store import RecordedMetric, metrics_store


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _protocol_name(request: Any, fallback: str) -> str:
    try:
        return request.app.state.protocol_name
    except Exception:
        return fallback


def build_app(*, protocol_name: str, large_payload_json_size_bytes: int = 5 * 1024 * 1024) -> FastAPI:
    """
    Build a single ASGI app. This app is served by:
      - Uvicorn HTTP/1.1 (TCP)
      - Uvicorn HTTP/2 (TCP)
      - aioquic HTTP/3 (QUIC/UDP)

    Each protocol server attaches `app.state.protocol_name`, so responses include the correct protocol.
    """

    app = FastAPI(title=f"HTTP Protocol Lab ({protocol_name})")
    app.state.protocol_name = protocol_name

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Build a stable ~5MB JSON payload once.
    # The exact byte size varies slightly due to JSON encoding overhead, but we target ~5MB.
    target_len = large_payload_json_size_bytes
    # "data": "<X>" will contribute overhead. We create a string close to target.
    data_len = max(0, target_len - len('{"data":""}') + 2)
    large_payload_str = "x" * data_len
    large_payload_obj = {"data": large_payload_str}
    large_payload_bytes = json.dumps(large_payload_obj).encode("utf-8")

    async def maybe_simulate_packet_loss(loss_percent: int, failure_status: int = 504) -> None:
        if loss_percent <= 0:
            return
        if loss_percent >= 100:
            raise HTTPException(status_code=failure_status, detail="Simulated packet loss")
        if random.random() < (loss_percent / 100.0):
            raise HTTPException(status_code=failure_status, detail="Simulated packet loss")

    @app.get("/api/ping")
    async def ping() -> dict[str, Any]:
        return {
            "message": "pong",
            "protocol": app.state.protocol_name,
            "timestamp": _utc_now_iso(),
        }

    @app.get("/api/large-payload")
    async def large_payload() -> JSONResponse:
        # Return the precomputed bytes to keep throughput measurements consistent.
        return JSONResponse(
            content=large_payload_obj,
            headers={"content-length": str(len(large_payload_bytes))},
        )

    @app.get("/api/delay/{milliseconds}")
    async def delay(milliseconds: int, loss: int = Query(0, description="Simulated packet loss percent (bonus)")) -> dict[str, Any]:
        if milliseconds < 0 or milliseconds > 60000:
            raise HTTPException(status_code=400, detail="milliseconds out of range")

        # Bonus: application-level packet loss simulation.
        await maybe_simulate_packet_loss(loss)

        expected_ms = milliseconds
        start = time.perf_counter()
        await asyncio.sleep(milliseconds / 1000.0)
        actual_ms = (time.perf_counter() - start) * 1000.0

        return {
            "message": "delayed",
            "protocol": app.state.protocol_name,
            "expected_delay_ms": expected_ms,
            "actual_delay_ms": actual_ms,
            "timestamp": _utc_now_iso(),
        }

    @app.get("/api/metrics")
    async def metrics_endpoint(protocol: str | None = None) -> dict[str, Any]:
        proto = protocol or app.state.protocol_name
        snap = await metrics_store.snapshot(protocol=proto)
        last = snap.get("last_metric") or {}
        return {
            "protocol": proto,
            "server_processing_time": last.get("server_processing_time_ms"),
            "request_received_at": last.get("request_received_at"),
            "response_sent_at": last.get("response_sent_at"),
            # Extra fields for the dashboard and charts.
            "avg_server_processing_time_ms": snap.get("avg_server_processing_time_ms"),
            "p50_server_processing_time_ms": snap.get("p50_server_processing_time_ms"),
            "sample_count": snap.get("sample_count"),
            "total_requests": snap.get("total_requests"),
        }

    @app.get("/api/status")
    async def status_endpoint() -> dict[str, Any]:
        return {
            "protocol": app.state.protocol_name,
            "uptime_seconds": metrics_store.uptime_seconds,
            "total_requests": metrics_store.total_requests,
        }

    @app.get("/api/concurrent")
    async def concurrent() -> dict[str, Any]:
        """
        Spawn concurrent async tasks and return execution statistics.
        """

        concurrency = 50
        delay_ms = 50

        async def worker() -> float:
            t0 = time.perf_counter()
            await asyncio.sleep(delay_ms / 1000.0)
            return (time.perf_counter() - t0) * 1000.0

        start_all = time.perf_counter()
        latencies: list[float] = []
        failed = 0
        # In case we later introduce packet loss or faults, collect failures explicitly.
        results = await asyncio.gather(*(worker() for _ in range(concurrency)), return_exceptions=True)
        for r in results:
            if isinstance(r, Exception):
                failed += 1
            else:
                latencies.append(float(r))

        total_ms = (time.perf_counter() - start_all) * 1000.0
        successes = concurrency - failed
        latencies_sorted = sorted(latencies)
        p95 = latencies_sorted[int(len(latencies_sorted) * 0.95) - 1] if latencies_sorted else None
        avg = sum(latencies) / len(latencies) if latencies else None

        return {
            "protocol": app.state.protocol_name,
            "concurrency": concurrency,
            "delay_ms": delay_ms,
            "success_count": successes,
            "failed_count": failed,
            "avg_latency_ms": avg,
            "p95_latency_ms": p95,
            "throughput_rps": (successes / (total_ms / 1000.0)) if total_ms > 0 else None,
            "total_duration_ms": total_ms,
        }

    @app.get("/api/stream")
    async def stream() -> StreamingResponse:
        """
        Server streaming over HTTP/1.1/HTTP/2/HTTP/3.
        Send chunks every second.
        """

        async def gen():
            for i in range(5):
                chunk_obj = {
                    "chunk": i + 1,
                    "protocol": app.state.protocol_name,
                    "timestamp": _utc_now_iso(),
                }
                yield (json.dumps(chunk_obj) + "\n").encode("utf-8")
                await asyncio.sleep(1.0)

        return StreamingResponse(gen(), media_type="application/x-ndjson")

    @app.get("/api/simulated-network")
    async def simulated_network(
        loss: int = Query(10, description="Simulated packet loss percent (bonus)"),
        delay_ms: int = Query(200, description="Base delay per request for measurement"),
        requests: int = Query(50, description="Number of concurrent requests"),
    ) -> dict[str, Any]:
        """
        Bonus endpoint: simulate packet loss behavior.

        Note: This PoC simulates loss at the application layer (randomly failing the handler),
        because the browser HTTP stack cannot reliably inject packet loss, and aioquic transport-level
        manipulation is beyond a small PoC.
        """

        if loss < 0 or loss > 100:
            raise HTTPException(status_code=400, detail="loss must be between 0 and 100")
        if delay_ms < 0 or delay_ms > 60000:
            raise HTTPException(status_code=400, detail="delay_ms out of range")
        if requests < 1 or requests > 1000:
            raise HTTPException(status_code=400, detail="requests out of range")

        sem = asyncio.Semaphore(min(1000, requests))

        async def one() -> float:
            async with sem:
                t0 = time.perf_counter()
                # Reuse the delay handler logic by calling the same simulation step.
                await maybe_simulate_packet_loss(loss)
                await asyncio.sleep(delay_ms / 1000.0)
                return (time.perf_counter() - t0) * 1000.0

        start_all = time.perf_counter()
        results = await asyncio.gather(*(one() for _ in range(requests)), return_exceptions=True)

        success_latencies: list[float] = []
        failed = 0
        for r in results:
            if isinstance(r, Exception):
                failed += 1
            else:
                success_latencies.append(float(r))

        total_ms = (time.perf_counter() - start_all) * 1000.0
        successes = requests - failed

        success_latencies_sorted = sorted(success_latencies)
        p95 = (
            success_latencies_sorted[int(len(success_latencies_sorted) * 0.95) - 1]
            if success_latencies_sorted
            else None
        )
        avg = sum(success_latencies) / len(success_latencies) if success_latencies else None
        throughput_rps = (successes / (total_ms / 1000.0)) if total_ms > 0 else None

        return {
            "protocol": app.state.protocol_name,
            "loss_percent": loss,
            "delay_ms": delay_ms,
            "request_count": requests,
            "success_count": successes,
            "failed_count": failed,
            "avg_latency_ms": avg,
            "p95_latency_ms": p95,
            "throughput_rps": throughput_rps,
            "total_duration_ms": total_ms,
        }

    # Attach middleware after handlers so routes are registered.
    return app

