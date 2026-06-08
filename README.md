# 🚀 HTTP Protocol Lab

A mini protocol laboratory designed to benchmark, visualize, and compare the performance of different HTTP protocols (**HTTP/1.1**, **HTTP/2**, and **HTTP/3**) in real-time.

## 📖 Description

This project provides a comprehensive environment to test and observe the evolution of HTTP protocols. It runs three distinct Python FastAPI servers simultaneously—each serving identical APIs over a different protocol—and pairs them with a dynamic React/Vite dashboard. This lab allows you to directly benchmark:

- **Latency:** Connection speed and round-trip times.
- **Throughput:** Data transfer efficiency for large payloads.
- **Concurrency:** Performance under high request volumes and multiplexing capabilities.
- **Streaming:** Real-time data delivery behavior.
- **Network Resilience:** Handling of packet loss (simulated at the application layer) to see how QUIC recovers compared to TCP.

---

## 🛠️ Tech Stack

- **Backend:** Python 3.12+, FastAPI, Uvicorn (HTTP/1), Hypercorn (HTTP/2), aioquic (HTTP/3)
- **Frontend:** Node.js, React, Vite, Tailwind CSS
- **Infrastructure:** Docker, Docker Compose

---

## 🚀 Quick Start (Docker - Recommended)

The easiest way to get everything running at once is to use Docker Compose.

1. **Build and start the application:**
   ```bash
   docker compose up --build
   ```
2. **Trust the certificates:**
   Because HTTP/2 and HTTP/3 require TLS, the backend auto-generates self-signed certificates. You must explicitly tell your browser to trust them:
   - Navigate to `https://localhost:8443/api/ping`
   - Bypass the browser warning (e.g., "Advanced" -> "Proceed to localhost")
3. **Open the Dashboard:**
   Navigate to `http://localhost:5173` in your browser.

---

## 💻 Manual Setup

If you prefer running everything locally on your host OS:

### Prerequisites
- Python 3.12+
- Node.js 18+
- Linux/WSL recommended (HTTP/3 relies on UDP)

### 1. Backend Setup

```bash
cd backend
python -m pip install -r requirements.txt
```

**Generate the TLS certificate:**
```bash
python scripts/generate_cert.py --common-name=localhost
```
*(This writes `backend/certs/server.crt` and `backend/certs/server.key`)*

**Run the servers in separate terminals:**

HTTP/1.1 (TCP - Cleartext)
```bash
python server.py --protocol=http1 --host=127.0.0.1 --port=8000
```

HTTP/2 (TCP + TLS)
```bash
python server.py --protocol=http2 --host=127.0.0.1 --port=8443
```

HTTP/3 (QUIC/UDP + TLS)
```bash
python server.py --protocol=http3 --host=127.0.0.1 --port=8443
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
Open `http://localhost:5173` and enjoy your benchmarking!

---

## 📡 API Endpoints

All servers provide the exact same endpoints:
* `GET /api/ping`
* `GET /api/large-payload` (~5MB JSON)
* `GET /api/delay/{milliseconds}`
* `GET /api/metrics`
* `GET /api/concurrent`
* `GET /api/stream` (NDJSON stream, 1 chunk/sec)
* `GET /api/simulated-network?loss=5|10|20` (Bonus endpoint for packet loss)
