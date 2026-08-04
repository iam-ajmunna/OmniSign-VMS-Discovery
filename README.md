# OmniSight VMS IP Camera Discovery

> **Enterprise-grade multi-protocol network discovery tool for local RTSP/ONVIF IP security cameras.**

OmniSight VMS Discovery is a high-performance system that scans subnets using 5 parallel discovery protocols to identify physical security cameras, resolve manufacturer hardware specs, compute certainty ratings, generate RTSP stream URLs, and export network audit reports.

---

## ⚡ Quick Start

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/iam-ajmunna/OmniSign-VMS-Discovery.git
cd OmniSign-VMS-Discovery
npm install
```

### 2. Launch Development Server
Start the Express backend daemon (`port 5001`) and Vite frontend (`port 5173`) concurrently:
```bash
npm run dev
```
Open your browser at `http://localhost:5173`.

### 3. Automated Test Suite
Execute the unit and integration test suite:
```bash
npm test
```

---

## 🛠️ Multi-Protocol Discovery Architecture

| Protocol | Port / Transport | Discovery Mechanism |
| :--- | :--- | :--- |
| **ARP** | OS System Call | Parses live IP-to-MAC hardware cache (`arp -an`) |
| **Ping Sweeper** | TCP / 50 Concurrent Sockets | Sweeps video ports (`554` RTSP, `80` HTTP, `8000` Hikvision SDK, `3702` ONVIF) |
| **SSDP (UPnP)** | UDP 1900 Multicast (`239.255.255.250`) | Fetches XML descriptors for exact model & serial numbers |
| **mDNS** | UDP 5353 Multicast (`224.0.0.251`) | Resolves `_rtsp._tcp.local` ZeroConf PTR records |
| **ONVIF** | UDP 3702 SOAP Multicast | Broadcasts `dn:NetworkVideoTransmitter` WS-Discovery envelopes |

---

## 📡 REST API Reference

### Health Check
`GET /api/v1/health`
Returns system status, version, uptime, and active scan session state.

### Subnets List
`GET /api/v1/subnets`
Returns active network interfaces and CIDR subnets available for scanning.

### Initiate Scan
`POST /api/v1/scan`
Triggers a new parallel scan session.

### Cancel Scan
`POST /api/v1/scan/cancel`
Aborts an in-progress scan session immediately via `AbortController`.

### Live SSE Event Stream
`GET /api/v1/scan/stream`
Server-Sent Events stream delivering real-time logs, scanner progress, and discovered device cards.

### RTSP Stream Generator
`POST /api/v1/camera/rtsp-urls`
Generates brand-tailored RTSP stream URLs for Hikvision, Dahua, Axis, Reolink, Tapo, and ONVIF devices.

### ONVIF Authentication Probe
`POST /api/v1/camera/onvif-auth`
Performs authenticated WS-Security SOAP probes to retrieve camera firmware, model, and serial details.

---

## 📁 Repository Structure

```
camera/
├── server/
│   ├── aggregator/     # Deduplication & property merger services
│   ├── config/         # Centralized network & protocol configuration
│   ├── events/         # Node.js EventBus pub/sub event channels
│   ├── logger/         # Structured terminal & SSE logger
│   ├── registry/       # Explicit scanner module registry
│   ├── scanners/       # Live ARP, Ping, SSDP, mDNS, ONVIF modules
│   ├── services/       # Session coordinator, vendor resolver, ONVIF auth
│   └── utils/          # OUI lookup database, input sanitizer, RTSP helper
├── src/
│   ├── components/     # React Header, ProgressGrid, CameraGrid, DevConsole, OnvifModal
│   └── utils/          # CSV & JSON browser export helpers
└── tests/              # Automated unit test suite
```

---

## 🔒 Security & Reliability Standards

- **Zero Command Injection**: All system commands use `execFile` with explicit argument arrays (`shell: false`).
- **Resource Lifecycle**: All UDP sockets, TCP sockets, timers, and SSE streams are released upon scan completion or cancellation.
- **Graceful Shutdown**: Intercepts `SIGINT` / `SIGTERM` signals to terminate background processes cleanly.

---

## 📜 License

MIT License. Developed for OmniSight VMS Core Systems.
