from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path

import uvicorn

from app.config import load_config
from app.handlers import build_app
from app.http3_server import run_http3_server
from app.middleware import MetricsMiddleware
from app.alt_svc import AltSvcMiddleware


def main() -> None:
    parser = argparse.ArgumentParser(description="HTTP/1.1, HTTP/2, and HTTP/3 (QUIC) protocol lab server")
    parser.add_argument("--protocol", choices=["http1", "http2", "http3"], default="http3", help="which protocol server to run")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=None)
    parser.add_argument("--log-level", default="info")
    args = parser.parse_args()

    logging.basicConfig(level=getattr(logging, args.log_level.upper(), logging.INFO))

    default_ports = {"http1": 8000, "http2": 8443, "http3": 8443}
    port = args.port if args.port is not None else default_ports[args.protocol]

    cfg = load_config(protocol=args.protocol, host=args.host, port=port)

    # Ensure TLS certs exist (HTTP/2 and HTTP/3).
    if args.protocol in {"http2", "http3"}:
        cert_ok = cfg.tls_cert_path.exists() and cfg.tls_key_path.exists()
        if not cert_ok:
            from scripts.generate_cert import generate_self_signed_cert

            common_name = os.getenv("TLS_COMMON_NAME", "localhost")
            generate_self_signed_cert(
                cert_path=cfg.tls_cert_path,
                key_path=cfg.tls_key_path,
                common_name=common_name,
            )

    # Build one shared FastAPI app for all protocols.
    app = build_app(protocol_name=args.protocol)
    app.add_middleware(MetricsMiddleware, protocol_name=args.protocol)

    if args.protocol == "http1":
        # HTTP/1.1: cleartext for easier local browser testing.
        uvicorn.run(app, host=args.host, port=port, log_level=args.log_level)
        return

    if args.protocol == "http2":
        # HTTP/2: Uvicorn only supports HTTP/1.1; Hypercorn provides native HTTP/2 over TLS.
        import asyncio

        from hypercorn.asyncio import serve as hypercorn_serve
        from hypercorn.config import Config as HypercornConfig

        cert_path = str(cfg.tls_cert_path)
        key_path = str(cfg.tls_key_path)
        app.add_middleware(
            AltSvcMiddleware,
            alt_svc_header_value=f'h3=":{port}"; ma={cfg.alt_svc_max_age_seconds}',
        )

        h2_config = HypercornConfig()
        h2_config.bind = [f"{args.host}:{port}"]
        h2_config.certfile = cert_path
        h2_config.keyfile = key_path
        h2_config.alpn_protocols = ["h2", "http/1.1"]
        h2_config.loglevel = args.log_level.upper()
        h2_config.alt_svc_headers = [f'h3=":{port}"; ma={cfg.alt_svc_max_age_seconds}']

        asyncio.run(hypercorn_serve(app, h2_config))
        return

    if args.protocol == "http3":
        # HTTP/3: QUIC/UDP with TLS and ALPN "h3".
        import asyncio

        asyncio.run(
            run_http3_server(
                host=args.host,
                port=port,
                cert_path=str(cfg.tls_cert_path),
                key_path=str(cfg.tls_key_path),
                app=app,
            )
        )
        return

    raise RuntimeError(f"Unsupported protocol: {args.protocol}")


if __name__ == "__main__":
    main()

