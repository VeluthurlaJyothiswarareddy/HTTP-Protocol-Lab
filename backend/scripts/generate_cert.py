from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def generate_self_signed_cert(*, cert_path: Path, key_path: Path, common_name: str) -> None:
    cert_path.parent.mkdir(parents=True, exist_ok=True)

    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    subject = issuer = x509.Name(
        [
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "HTTP3 Lab"),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ]
    )

    now = datetime.now(timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - timedelta(minutes=1))
        .not_valid_after(now + timedelta(days=365))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName(common_name)]), critical=False)
        .sign(key, hashes.SHA256())
    )

    key_bytes = key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.TraditionalOpenSSL,
        encryption_algorithm=serialization.NoEncryption(),
    )

    cert_bytes = cert.public_bytes(serialization.Encoding.PEM)

    key_path.write_bytes(key_bytes)
    cert_path.write_bytes(cert_bytes)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate a self-signed certificate for HTTP/2 and HTTP/3")
    parser.add_argument("--cert-dir", default=None, help="Directory to place server.crt and server.key")
    parser.add_argument("--common-name", default="localhost", help="Certificate Common Name (also used for SAN)")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parents[2]
    cert_dir = Path(args.cert_dir) if args.cert_dir else base_dir / "certs"

    cert_path = cert_dir / "server.crt"
    key_path = cert_dir / "server.key"

    generate_self_signed_cert(cert_path=cert_path, key_path=key_path, common_name=args.common_name)
    print(f"Wrote TLS cert: {cert_path}")
    print(f"Wrote TLS key: {key_path}")


if __name__ == "__main__":
    main()

