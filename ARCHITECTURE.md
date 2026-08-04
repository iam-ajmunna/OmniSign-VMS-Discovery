# OmniSight VMS IP Camera Discovery — Architecture Specification

This document details the architectural design, event flow pipeline, and deduplication logic of the OmniSight VMS IP Camera Discovery application.

---

## 🏗️ High-Level System Architecture

```
                       +-------------------------+
                       |   React Dashboard UI    |
                       +------------+------------+
                                    |
                               (SSE Stream)
                                    v
+-----------------------------------+-----------------------------------+
|                           Express Backend                             |
|                                                                       |
|  +---------------------+   +---------------------+   +-------------+  |
|  | SessionCoordinator  |-->|   ScannerRegistry   |-->| EventBus    |  |
|  +---------------------+   +---------------------+   +------+------+  |
|                                                             |         |
|  +---------------------+   +---------------------+          |         |
|  | AggregatorPipeline  |<--|     DeviceStore     |<---------+         |
|  +---------------------+   +---------------------+                    |
+-----------------------------------+-----------------------------------+
                                    |
                +-------------------+-------------------+
                |                   |                   |
                v                   v                   v
          +-----------+       +-----------+       +-----------+
          |  Ping/TCP |       | SSDP/UDP  |       | ONVIF/UDP |
          +-----------+       +-----------+       +-----------+
```

---

## 🔄 Event Lifecycle

1. **Session Initiation**:
   - User triggers `POST /api/v1/scan`.
   - `SessionCoordinator` verifies scanning locks, clears `DeviceStore`, initializes `AbortController`, and sets a 35-second safety timer.
   - Emits `SCAN_STARTED` on `EventBus`.

2. **Parallel Scanner Dispatch**:
   - `SessionCoordinator` launches active protocol scanners (`ARP`, `Ping`, `SSDP`, `mDNS`, `ONVIF`) in parallel using `Promise.allSettled()`.
   - Each scanner emits `SCANNER_STARTED` and streams progress percentages via `SCANNER_PROGRESS`.

3. **Discovery & Aggregation**:
   - As raw scanner hits arrive, scanners emit `DEVICE_FOUND`.
   - `AggregatorCoordinator` receives raw devices and invokes `deviceDeduplicator.findMatch()`.
   - `deviceDeduplicator` matches candidates by **MAC address primary authority**, falling back to **IP address**.
   - `deviceMerger` consolidates properties (discovery methods, open ports, payloads) and invokes `confidenceCalculator`.
   - `deviceStore` saves updated records and emits `DEVICE_UPDATED`.

4. **Post-Sweep ARP Refresh**:
   - Once TCP ping and UDP probes complete, `SessionCoordinator` executes a post-sweep ARP refresh.
   - Captures MAC addresses of all newly pinged IPs from the OS ARP cache and promotes store keys from `ip_...` to `mac_...`.

5. **Completion & SSE Streaming**:
   - `SseManager` bridges all `EventBus` signals into JSON payloads streamed live to connected browser clients over `GET /api/v1/scan/stream`.

---

## 🔒 Security & Resource Governance

- **Execution Isolation**: Individual scanner failures are caught within try/catch blocks and logged without interrupting the global scan session.
- **Cancellation Tokens**: `AbortController.signal` is passed to all child processes and UDP sockets. Cancelling a scan immediately closes sockets and kills child processes.
- **Memory Safety**: `DeviceStore` operates as an in-memory volatile Map flushed at the start of each scan session.
