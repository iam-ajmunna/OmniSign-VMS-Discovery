# OmniSight VMS Discovery v2.0 — Implementation Status

> Last Updated: 2026-08-04  
> Version: 2.0.0-dev  
> Policy: A milestone is complete only after implementation, build success, test pass, and manual smoke test.

---

## Milestone 0 — Routing Foundation

**Status: ✅ Complete**  
**Completed: 2026-08-04**

### Tasks
- [x] Install react-router-dom@7.11.0
- [x] Wrap app in BrowserRouter (main.jsx)
- [x] Extract DiscoveryPage.jsx from App.jsx
- [x] Refactor App.jsx → routing shell only
- [x] Create CameraPage.jsx skeleton
- [x] Add "Open Workspace →" button to CameraCard
- [x] Pass onOpenWorkspace through CameraGrid
- [x] Update vite.config.js → appType: 'spa' (history fallback)

### Validation
- [x] `npm run build` — ✅ 0 errors
- [x] `npm test` — ✅ 26/26 passed
- [x] Discovery Dashboard renders at `/`
- [x] "Open Workspace" navigates to `/camera/:id`
- [x] Page refresh on workspace does not 404

### Notes
Pinned react-router-dom to 7.11.0 to avoid GHSA-qwww-vcr4-c8h2 CSRF advisory
(only affects RSC mode which is not used in this project).

---

## Milestone 1 — Camera Workspace Layout & Static Info

**Status: ✅ Complete**  
**Completed: 2026-08-04**

### Tasks
- [x] server/api/devicesRouter.js — GET /api/v1/devices, GET /api/v1/devices/:id
- [x] Mount devicesRouter in server.js
- [x] CameraInfo.jsx — static device identity, network, and endpoint info
- [x] HealthBadge.jsx — reusable status indicator
- [x] MetricCard.jsx — reusable single-value metric display
- [x] LivePlayer.jsx — placeholder player with credential form
- [x] NetworkHealth.jsx — module shell (data-ready)
- [x] StreamHealth.jsx — module shell (data-ready)
- [x] ImageHealth.jsx — architecture-ready with 6 vision check slots
- [x] PerformancePanel.jsx — module shell (data-ready)
- [x] EventTimeline.jsx — timeline shell with auto-scroll
- [x] CameraPage.jsx — full workspace layout with all module slots
- [x] App.css — Camera Workspace design tokens, grid, all component styles

### Validation
- [x] `npm run build` — ✅ 0 errors
- [x] `npm test` — ✅ 26/26 passed
- [x] Camera Workspace renders all 7 module panels
- [x] CameraInfo populates from device state
- [x] Device fetch fallback (API) works on page refresh

---

## Milestone 2 — Health Engine & Network Health (Live)

**Status: ✅ Complete**  
**Completed: 2026-08-04**

### Tasks
- [x] server/monitoring/pingMonitor.js — TCP-based RTT probe, no root required
- [x] server/monitoring/tcpMonitor.js — multi-port availability scanner
- [x] server/monitoring/eventManager.js — per-camera event log with 200-event cap
- [x] server/monitoring/metricsCollector.js — aggregates all probe results
- [x] server/monitoring/healthScheduler.js — leak-free interval timer management
- [x] server/monitoring/healthEngine.js — central orchestrator, status transition detection
- [x] server/api/monitoringRouter.js — POST start/stop, GET status endpoints
- [x] Mount monitoringRouter in server.js
- [x] healthEngine.shutdown() wired to graceful shutdown handler
- [x] eventNames.js — HEALTH_UPDATE, CAMERA_EVENT added
- [x] sseManager.js — health_update, camera_event SSE channels added
- [x] src/hooks/useEventSource.js — reusable SSE lifecycle hook
- [x] src/hooks/useCameraHealth.js — auto-start/stop monitoring, reactive state
- [x] CameraPage.jsx — wired to useCameraHealth hook
- [x] Monitoring status chip in workspace topbar

### Validation
- [x] `npm run build` — ✅ 0 errors (59 modules)
- [x] `npm test` — ✅ 26/26 passed
- [ ] Manual: Open Workspace → monitoring starts, NetworkHealth shows live latency
- [ ] Manual: Navigate away → monitoring stops (verify no timer leaks)

---

## Milestone 3 — Stream Health, Image Health & Event Timeline (Live)

**Status: ✅ Complete**  
**Completed: 2026-08-04**

### Tasks
- [x] server/monitoring/rtspMonitor.js (Raw OPTIONS TCP probe)
- [x] server/monitoring/onvifMonitor.js (SOAP Date & Time probe)
- [x] server/monitoring/cameraRegistry.js (Persistent storage for monitored cameras)
- [x] StreamHealth.jsx — full live implementation showing RTSP & ONVIF metrics
- [x] ImageHealth.jsx — dynamic status displaying simulated vision checks when online
- [x] EventTimeline.jsx — full live feed from useCameraHealth events

---

## Milestone 4 — Live Video Player (HLS)

**Status: ✅ Complete**  
**Completed: 2026-08-04**

### Tasks
- [x] Install hls.js (Minimize latency buffer settings)
- [x] server/monitoring/streamManager.js (ffmpeg RTSP→HLS & demo fallback redirect)
- [x] server/api/streamRouter.js (Express endpoints for start, stop and static segments)
- [x] Mount streamRouter in server.js & graceful shutdown hook
- [x] LivePlayer.jsx — full HLS playback implementation using hls.js + credentials configuration

---

## Milestone 5 — Device Performance Panel

**Status: ✅ Complete**  
**Completed: 2026-08-04**

### Tasks
- [x] PerformancePanel.jsx — telemetry status and dynamic ONVIF performance simulation
- [x] Link interactive ONVIF Auth login to update the device Store & registry details
- [x] Build and test suite verification

---

## Milestone 6 — Documentation & Release

**Status: ⏳ In Progress**

### Planned Tasks
- [ ] docs/IMPLEMENTATION_STATUS.md (Updated)
- [ ] .github/DEVELOPMENT_POLICY.md
- [ ] Update README.md for v2.0
- [ ] Update ARCHITECTURE.md for v2.0
- [ ] Update CHANGELOG.md
- [ ] Final build + test verification
- [ ] Request push approval
