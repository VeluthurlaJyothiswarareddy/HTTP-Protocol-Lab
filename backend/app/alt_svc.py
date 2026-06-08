from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class AltSvcMiddleware(BaseHTTPMiddleware):
    """
    Adds an Alt-Svc header so browsers can attempt HTTP/3 (QUIC) upgrades.
    """

    def __init__(self, app, *, alt_svc_header_value: str) -> None:
        super().__init__(app)
        self._alt_svc_header_value = alt_svc_header_value

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers.setdefault("alt-svc", self._alt_svc_header_value)
        return response

