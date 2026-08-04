# OmniSight VMS IP Camera Discovery (v2.0)

> **Enterprise-grade multi-protocol network discovery tool and live health monitoring platform for local RTSP/ONVIF IP security cameras.**

OmniSight VMS Discovery is a high-performance system that scans subnets using 5 parallel discovery protocols to identify physical security cameras, resolve manufacturer hardware specs, compute certainty ratings, generate RTSP stream URLs, and export network audit reports.

**Version 2.0 introduces the Camera Workspace**, turning a simple discovery utility into a professional camera monitoring and stream diagnostics dashboard.

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

## 🚀 Key v2.0 Monitoring Capabilities
* **Camera Workspace**: Dedicated diagnostic space per camera containing information panels, live feed, stream stats, network status, image health, and events.
* **Health Engine**: Central scheduler implementing multi-probed monitoring intervals (ICMP/TCP ping, RTSP ports, ONVIF ports) with automatic status transition loggers.
* **HLS Live Transcoder**: Spawns ffmpeg sessions to transcode RTSP into browser-ready HLS files, falling back to a mock CDN demo stream when camera is offline or ffmpeg is missing.
* **Dynamic Performance Telemetry**: Simulated ONVIF system details (CPU, memory, uptime, temperature) mapped live when cameras are connected.
* **Image Health Checks**: Architecture-ready slots for computer vision checks (blur, blackout, obstruction, etc.).

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
Server-Sent Events stream delivering real-time logs, scanner progress, discovered devices, and live health metrics.

### RTSP Stream Generator
`POST /api/v1/camera/rtsp-urls`
Generates brand-tailored RTSP stream URLs for Hikvision, Dahua, Axis, Reolink, Tapo, and ONVIF devices.

### ONVIF Authentication Probe
`POST /api/v1/camera/onvif-auth`
Performs authenticated WS-Security SOAP probes to retrieve camera firmware, model, and serial details.

### HLS Live Streaming Control
* `POST /api/v1/stream/:id/start`: Triggers ffmpeg transcoding.
* `POST /api/v1/stream/:id/stop`: Terminates transcoding process.
* `GET /api/v1/stream/:id/:filename`: Serves HLS playlists and segments.

---

## 📁 Repository Structure

```
camera/
├── server/
│   ├── aggregator/     # Deduplication, DeviceStore, and property merger
│   ├── api/            # Express routers for devices, monitoring, and streaming
│   ├── config/         # Centralized network & protocol configuration
│   ├── events/         # Node.js EventBus pub/sub event channels
│   ├── logger/         # Structured terminal & SSE logger
│   ├── monitoring/     # Ping, TCP, RTSP, ONVIF health engine & stream manager
│   ├── registry/       # Explicit scanner module registry
│   ├── scanners/       # Live ARP, Ping, SSDP, mDNS, ONVIF modules
│   ├── services/       # Session coordinator, vendor resolver, ONVIF auth
│   └── utils/          # OUI lookup database, input sanitizer, RTSP helper
├── src/
│   ├── components/     # React Header, ProgressGrid, CameraGrid, DevConsole, OnvifModal
│   │   └── camera/     # Workspace panels: LivePlayer, EventTimeline, MetricCard, StreamHealth...
│   ├── pages/          # SPA Pages: DiscoveryPage, CameraPage
│   ├── hooks/          # useCameraHealth and useEventSource utilities
│   └── utils/          # CSV & JSON browser export helpers
└── tests/              # Automated unit test suite
```

---

## 🔒 Security & Reliability Standards

- **Zero Command Injection**: All system commands use `execFile` or parameterized arguments.
- **Resource Lifecycle**: All UDP sockets, TCP sockets, timers, SSE streams, and child transcode processes are released upon session termination or cancellation.
- **Graceful Shutdown**: Intercepts `SIGINT` / `SIGTERM` signals to terminate background processes and transcoding daemons cleanly.

---

## 📜 License

MIT License. Developed for OmniSight VMS Core Systems.
