from __future__ import annotations

import asyncio
import statistics
import time
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Deque


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class RecordedMetric:
    protocol: str
    request_received_at: str
    response_sent_at: str
    server_processing_time_ms: float
    response_size_bytes: int
    request_path: str


class MetricsStore:
    def __init__(self, *, max_history: int = 200) -> None:
        self._lock = asyncio.Lock()
        self._history: Deque[RecordedMetric] = deque(maxlen=max_history)
        self._total_requests = 0
        self._start_ts = time.time()

    @property
    def total_requests(self) -> int:
        return self._total_requests

    @property
    def uptime_seconds(self) -> float:
        return time.time() - self._start_ts

    async def record(self, metric: RecordedMetric) -> None:
        async with self._lock:
            self._history.append(metric)
            self._total_requests += 1

    async def snapshot(self, *, protocol: str | None = None) -> dict:
        async with self._lock:
            items = list(self._history)

        if protocol is not None:
            items = [m for m in items if m.protocol == protocol]

        latencies = [m.server_processing_time_ms for m in items]
        p50 = statistics.median(latencies) if latencies else None
        avg = sum(latencies) / len(latencies) if latencies else None

        last = items[-1] if items else None
        return {
            "protocol_filter": protocol,
            "total_requests": self._total_requests,
            "uptime_seconds": self.uptime_seconds,
            "last_metric": None if last is None else {k: getattr(last, k) for k in last.__dict__.keys()},
            "avg_server_processing_time_ms": avg,
            "p50_server_processing_time_ms": p50,
            "sample_count": len(items),
        }


metrics_store = MetricsStore()

