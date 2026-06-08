from __future__ import annotations

import asyncio
import logging
import time
from email.utils import formatdate
from functools import partial
from typing import Any, Callable, Optional

from aioquic.asyncio import QuicConnectionProtocol, serve
from aioquic.h3.connection import H3_ALPN, H3Connection
from aioquic.h3.events import DataReceived, HeadersReceived, H3Event
from aioquic.quic.configuration import QuicConfiguration
from aioquic.quic.events import ProtocolNegotiated, QuicEvent

logger = logging.getLogger("http3-server")

SERVER_NAME = "http3-lab"
AsgiApplication = Callable[..., Any]


class HttpRequestHandler:
    def __init__(
        self,
        *,
        authority: bytes,
        connection: H3Connection,
        protocol: QuicConnectionProtocol,
        scope: dict[str, Any],
        stream_ended: bool,
        stream_id: int,
        transmit: Callable[[], None],
        app: AsgiApplication,
    ) -> None:
        self.authority = authority
        self.connection = connection
        self.protocol = protocol
        self.queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self.scope = scope
        self.stream_id = stream_id
        self.transmit = transmit
        self._app = app

        # For GET requests, stream_ended is almost always true already when headers arrive.
        if stream_ended:
            self.queue.put_nowait({"type": "http.request", "body": b"", "more_body": False})

    def http_event_received(self, event: H3Event) -> None:
        if isinstance(event, DataReceived):
            self.queue.put_nowait(
                {
                    "type": "http.request",
                    "body": event.data,
                    "more_body": not event.stream_ended,
                }
            )
        elif isinstance(event, HeadersReceived) and event.stream_ended:
            self.queue.put_nowait({"type": "http.request", "body": b"", "more_body": False})

    async def run(self) -> None:
        await self._app(self.scope, self.receive, self.send)

    async def receive(self) -> dict[str, Any]:
        return await self.queue.get()

    async def send(self, message: dict[str, Any]) -> None:
        if message["type"] == "http.response.start":
            # aioquic expects header values as bytes.
            status = message["status"]
            extra_headers = [(k, v) for (k, v) in message.get("headers", [])]
            self.connection.send_headers(
                stream_id=self.stream_id,
                headers=[(b":status", str(status).encode()), (b"server", SERVER_NAME.encode()), (b"date", formatdate(time.time(), usegmt=True).encode())]
                + extra_headers,
            )
        elif message["type"] == "http.response.body":
            body = message.get("body", b"") or b""
            self.connection.send_data(
                stream_id=self.stream_id,
                data=body,
                end_stream=not message.get("more_body", False),
            )

        self.transmit()


class Http3ServerProtocol(QuicConnectionProtocol):
    """
    Minimal HTTP/3 server adapter.

    It forwards HTTP/3 requests to the same FastAPI ASGI application used by HTTP/1.1 and HTTP/2.
    """

    def __init__(self, *args: Any, app: AsgiApplication, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self._handlers: dict[int, HttpRequestHandler] = {}
        self._http: Optional[H3Connection] = None
        self._app = app

    def http_event_received(self, event: H3Event) -> None:
        if isinstance(event, HeadersReceived) and event.stream_id not in self._handlers:
            method = ""
            raw_path = b""
            path = "/"
            query_string = b""
            authority: bytes = b""
            extra_headers: list[tuple[bytes, bytes]] = []

            # HeadersReceived contains pseudo-headers like :method, :path, etc.
            for header, value in event.headers:
                if header == b":authority":
                    authority = value
                    extra_headers.append((b"host", value))
                elif header == b":method":
                    method = value.decode("utf-8", errors="ignore")
                elif header == b":path":
                    raw_path = value
                elif header == b":scheme":
                    # not used directly; kept in scope for ASGI compatibility
                    pass
                elif header and not header.startswith(b":"):
                    extra_headers.append((header, value))

            if b"?" in raw_path:
                path_bytes, query_string = raw_path.split(b"?", maxsplit=1)
            else:
                path_bytes = raw_path
            path = path_bytes.decode("utf-8", errors="ignore") or "/"

            scope: dict[str, Any] = {
                "type": "http",
                "http_version": "3",
                "method": method,
                "scheme": "https",
                "path": path,
                "raw_path": raw_path,
                "query_string": query_string,
                "root_path": "",
                "headers": extra_headers,
                "client": ("0.0.0.0", 0),
                "app": self._app,
            }

            assert self._http is not None
            handler = HttpRequestHandler(
                authority=authority,
                connection=self._http,
                protocol=self,
                scope=scope,
                stream_ended=event.stream_ended,
                stream_id=event.stream_id,
                transmit=self.transmit,
                app=self._app,
            )
            self._handlers[event.stream_id] = handler
            asyncio.ensure_future(handler.run())
            return

        if isinstance(event, (DataReceived, HeadersReceived)) and event.stream_id in self._handlers:
            self._handlers[event.stream_id].http_event_received(event)

    def quic_event_received(self, event: QuicEvent) -> None:
        if isinstance(event, ProtocolNegotiated):
            if event.alpn_protocol in H3_ALPN:
                self._http = H3Connection(self._quic)

        if self._http is not None:
            for http_event in self._http.handle_event(event):
                self.http_event_received(http_event)


async def run_http3_server(*, host: str, port: int, cert_path: str, key_path: str, app: AsgiApplication) -> None:
    configuration = QuicConfiguration(alpn_protocols=H3_ALPN, is_client=False)
    configuration.load_cert_chain(cert_path, key_path)

    logger.info("Starting HTTP/3 on %s:%s (UDP)", host, port)

    # aioquic's serve() needs a protocol factory. We bind our FastAPI app via the protocol constructor.
    protocol_factory = partial(Http3ServerProtocol, app=app)
    await serve(
        host,
        port,
        configuration=configuration,
        create_protocol=protocol_factory,
        retry=False,
    )

    # serve() does not return. This is here for completeness.
    await asyncio.Future()

