from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Awaitable, Callable

from fastapi import Request
from starlette.background import BackgroundTask
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response, StreamingResponse

from .metrics_store import RecordedMetric, metrics_store


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class MetricsMiddleware(BaseHTTPMiddleware):
    """
    Records basic request/response metrics for all protocols (HTTP/1.1, HTTP/2, HTTP/3).

    For non-streaming responses, we can measure response size immediately.
    For streaming responses, we count bytes as chunks are produced and record at end.
    """

    def __init__(self, app, protocol_name: str) -> None:
        super().__init__(app)
        self._protocol_name = protocol_name

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_received_at = _utc_now_iso()
        start_perf = time.perf_counter()

        response = await call_next(request)

        # Non-streaming: Response.body is populated.
        if not isinstance(response, StreamingResponse):
            body = getattr(response, "body", b"") or b""
            response_size = len(body)
            response_sent_at = _utc_now_iso()
            server_processing_time_ms = (time.perf_counter() - start_perf) * 1000.0

            await metrics_store.record(
                RecordedMetric(
                    protocol=self._protocol_name,
                    request_received_at=request_received_at,
                    response_sent_at=response_sent_at,
                    server_processing_time_ms=server_processing_time_ms,
                    response_size_bytes=response_size,
                    request_path=str(request.url.path),
                )
            )

            response.headers.setdefault("x-protocol", self._protocol_name)
            response.headers.setdefault("x-server-processing-time-ms", f"{server_processing_time_ms:.2f}")
            response.headers.setdefault("x-response-size-bytes", str(response_size))
            response.headers.setdefault("x-request-received-at", request_received_at)
            response.headers.setdefault("x-response-sent-at", response_sent_at)
            return response

        # Streaming: count bytes as the body_iterator is consumed.
        original_iter = response.body_iterator
        response_size = 0

        async def counting_iter():
            nonlocal response_size
            async for chunk in original_iter:
                response_size += len(chunk)
                yield chunk

            response_sent_at = _utc_now_iso()
            server_processing_time_ms = (time.perf_counter() - start_perf) * 1000.0

            await metrics_store.record(
                RecordedMetric(
                    protocol=self._protocol_name,
                    request_received_at=request_received_at,
                    response_sent_at=response_sent_at,
                    server_processing_time_ms=server_processing_time_ms,
                    response_size_bytes=response_size,
                    request_path=str(request.url.path),
                )
            )

        response.body_iterator = counting_iter()
        response.headers.setdefault("x-protocol", self._protocol_name)
        response.headers.setdefault("x-request-received-at", request_received_at)
        return response

