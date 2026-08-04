# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
