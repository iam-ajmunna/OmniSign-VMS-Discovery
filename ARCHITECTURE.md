# OmniSight VMS IP Camera Discovery (v2.0) — Architecture Specification

This document details the architectural design, event flow pipeline, deduplication logic, health monitoring engine, and transcoding streaming pipelines of the OmniSight VMS IP Camera Discovery application.

---

## 🏗️ High-Level System Architecture

```
                       +-------------------------+
                       |   React Dashboard UI    |
                       +-----+-------------+-----+
                             |             ^
                      (HTTP REST)       (SSE Stream)
                             v             |
+----------------------------+-------------+---------------------------+
|                           Express Backend                             |
|                                                                       |
|  +---------------------+   +---------------------+   +-------------+  |
|  | SessionCoordinator  |-->|   ScannerRegistry   |-->| EventBus    |  |
|  +---------------------+   +---------------------+   +------+------+  |
|                                                             |         |
|  +---------------------+   +---------------------+          |         |
|  | AggregatorPipeline  |<--|     DeviceStore     |<---------+         |
|  +---------------------+   +---+-----------------+                    |
|                                |                                      |
|                                v                                      |
|                      +---------+---------+                            |
|                      |  CameraRegistry   |<---+                       |
|                      +---------+---------+    |                       |
|                                |              |                       |
|                                v              |                       |
|                      +---------+---------+    | (Update Info)         |
|                      |   HealthEngine    |    |                       |
|                      +----+---------+----+    |                       |
|                           |         |         |                       |
|                           v         v         |                       |
|                     +-----+---+ +---+-----+   |                       |
|                     |Scheduler| |Transcode|---+                       |
|                     |  Probes | | (FFmpeg)|                           |
|                     +---------+ +---------+                           |
+-----------------------------------------------------------------------+
```

---

## 🔄 Lifecycle Workflows

### 1. Discovery Session
* **Initiation**: User triggers `POST /api/v1/scan`. `SessionCoordinator` verifies locks, clears `DeviceStore`, sets an AbortController, and launches parallel scanners.
* **Parallel Scans**: Active probes (`ARP`, `Ping`, `SSDP`, `mDNS`, `ONVIF`) sweep subnets in parallel.
* **Aggregation**: Raw hits matched via `deviceDeduplicator` using **MAC address primary authority**. Consolidated profiles saved in `DeviceStore`.
* **Post-Sweep**: OS ARP table cache queried to resolve any missing MAC addresses before completion.

### 2. Live Health Monitoring Engine
* **Reactive Activation**: When the user opens a Camera Workspace (`/camera/:id`), the frontend mounts `CameraPage.jsx` and registers `useCameraHealth()`.
* **Engine Command**: The hook sends `POST /api/v1/monitor/:id/start` to the backend. The backend registers the camera in the persistent `CameraRegistry` and starts a recurring `healthScheduler` loop (default: 30 seconds).
* **Granular Probing**: On each check tick, `metricsCollector` executes parallel probes:
  * `pingMonitor`: TCP RTT measurement.
  * `tcpMonitor`: Multi-port scanning.
  * `rtspMonitor`: Raw OPTIONS handshake connection.
  * `onvifMonitor`: SOAP GetSystemDateAndTime query.
* **State Broadcast**: The Health Engine detects state transitions (e.g. online → offline, RTSP stream lost, etc.), logs events to `eventManager`, and broadcasts updated snapshots over the Server-Sent Events (SSE) channel.
* **Graceful Termination**: Navigating away from the workspace triggers a monitoring stop command. Backend kills the scheduler timer to prevent memory leaks.

### 3. HLS Live Streaming Pipeline
* **Transcoder Launch**: When the user starts streaming in the UI, a POST request is sent to `/api/v1/stream/:id/start`.
* **ffmpeg Transcoding**: If `ffmpeg` is installed on the host OS, `streamManager` spawns a child process:
  ```bash
  ffmpeg -rtsp_transport tcp -i rtsp://... -c:v copy -an -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments ...
  ```
  This copies H.264 video payload to local HLS segments in `server/data/streams/:id/` without encoding overhead.
* **Demo/Mock Fallback**: If `ffmpeg` is missing or the camera is offline, `streamManager` enters fallback mode. Requests for the HLS playlist redirect directly to a public test stream (e.g., Big Buck Bunny) hosted on a CORS-supported CDN.
* **Idle Cleanup**: A background loop monitors stream usage. If a stream hasn't been touched/accessed by a client for 30 seconds, `streamManager` automatically kills the ffmpeg process and deletes local files.

---

## 🔒 Security & Resource Governance

- **Execution Isolation**: System commands parameters are strictly checked to prevent shell injections.
- **Graceful Shutdown**: Intercepts `SIGINT` and `SIGTERM` to stop all active monitoring timers, kill active transcode subprocesses, and clean up temporary stream directories.
- **Memory Safety**: Timer and socket hooks utilize `.unref()` to keep the Node event loop unblocked. Stream cleanup handles directory deletion asynchronously with robust exception guards.
