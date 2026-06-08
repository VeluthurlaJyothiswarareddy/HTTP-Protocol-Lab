from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class AppConfig:
    protocol: str
    host: str
    port: int
    tls_cert_path: Path
    tls_key_path: Path
    # HTTP/3 and HTTP/2 both require TLS in browsers.
    alt_svc_max_age_seconds: int = 2592000  # 30 days


def load_config(*, protocol: str, host: str, port: int) -> AppConfig:
    base_dir = Path(os.getenv("BACKEND_BASE_DIR", Path(__file__).resolve().parents[2]))
    cert_dir = base_dir / "certs"

    return AppConfig(
        protocol=protocol,
        host=host,
        port=port,
        tls_cert_path=cert_dir / "server.crt",
        tls_key_path=cert_dir / "server.key",
    )

