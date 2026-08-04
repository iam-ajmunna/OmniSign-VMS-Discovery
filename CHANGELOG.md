# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-08-04

### Added
- **Camera Workspace Page**: Rich, multi-panel diagnostic interface per camera.
- **Client Routing SPA Foundation**: Configured `react-router-dom` in the client with proper history-fallback on Vite (`appType: 'spa'`).
- **Health Engine**: Centralized, memory-leak-safe orchestrator with automated interval scheduler (`healthScheduler`) and status transition logger.
- **Multi-Probed Network Health**: Integrated TCP ping, port scanning, dynamic RTSP connection validation, and ONVIF unauthenticated status checks.
- **Granular Event Logging**: Tracks and streams connection updates, warnings, and error events to the event timeline in real-time.
- **HLS Transcoder & Streaming Server**: Integrated `ffmpeg` RTSP to HLS transcoder serving live segments with auto-cleanup of inactive streams after 30 seconds.
- **Mock HLS Fallback**: Automatically redirects streaming requests to a public test stream (Big Buck Bunny) when cameras are offline or `ffmpeg` is missing.
- **Dynamic Telemetry & Computer Vision Analysis**: Renders simulated device performance metrics (CPU, Memory, Temp, Storage, Uptime) and 6 simulated image diagnostics (frozen frame, blur, blockage, etc.).
- **Interactive ONVIF Integration**: Successful ONVIF login updates both volatile `DeviceStore` and persistent `cameraRegistry` details dynamically in the workspace.

## [1.0.0] - 2026-08-04

### Added
- **Multi-Protocol Discovery**: ARP, Ping TCP sweeper (ports 554, 80, 8000, 3702), SSDP (UPnP M-SEARCH), mDNS, and ONVIF WS-Discovery.
- **Session Coordinator**: Active scan locks, AbortController cancellation, 35-second safety timer, and post-sweep ARP refresh.
- **Deduplication Engine**: MAC address primary match and IP fallback consolidation.
- **Camera Vendor Intelligence Database**:
  - `ieee_oui.json`: 90+ verified OUI assignments.
  - `camera_vendors.json`: Canonical names, aliases, ports, and RTSP stream templates.
  - `fingerprints.json`: HTTP, ONVIF, SSDP, and mDNS network signature strings.
- **User Interface**: Glassmorphism dashboard with loading status badges, RTSP link copier, interactive ONVIF Authentication Modal, and developer logging console.
- **Exports**: Direct browser downloads for CSV and JSON network reports.
- **Automated Tests**: Unit and integration test suite (`tests/testRunner.js`).

### Fixed
- Fixed backend startup crash caused by missing `getNetworkInterfaces` export in `config/index.js`.
- Fixed frontend Vite ReferenceError by restoring hook and component imports at the top of `src/App.jsx`.
- Excluded general TP-Link mesh routers (`Deco X50`) and generic AP hardware from appearing on the camera grid by refining `isCameraVendor` to match specific sub-brand aliases (`Tapo`, `VIGI`).
