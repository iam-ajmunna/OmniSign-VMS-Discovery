# OmniSight VMS Discovery — Development & Git Policy

This document establishes the strict development rules, branching strategies, testing policies, and release workflows for the OmniSight VMS Discovery module. All contributors and agentic systems must comply with these guidelines.

---

## 1. Branching & Git Policy

### ⚠️ Absolute Rule: No Direct Push
* **No direct pushes to the `main` or `master` branches are permitted under any circumstances without explicit manual approval from the repository owner.**
* All code additions, modifications, or deletions must be submitted via a Pull Request (PR) or approved workspace changeset.

### Branch Naming Conventions
* **Feature Branches**: `feature/vms-<description>` (e.g., `feature/vms-health-engine`)
* **Bug Fixes**: `bugfix/vms-<description>` (e.g., `bugfix/vms-sse-leak`)
* **Hotfixes**: `hotfix/vms-<description>`

---

## 2. Code Quality & Formatting

* **ES6 Modules**: Keep using `import`/`export` syntax. CommonJS (`require`) is deprecated for server files in this codebase.
* **Error Resilience**:
  * All networking calls (UDP, TCP, HTTP SOAP) must implement strict timeouts and robust connection error-catching.
  * Backend monitoring tools (e.g., `healthScheduler`) must use `.unref()` on intervals/timers to ensure they do not keep the event loop alive, preventing clean daemon exits.
* **No Dangling Processes**:
  * Child processes spawned (e.g., `ffmpeg` for HLS transcoding) must be tracked and cleanly killed with `SIGTERM` when streams go idle or during graceful server shutdown.

---

## 3. Testing & Verification

### Mandatory Testing Policy
No feature or milestone shall be marked as complete unless:
1. **Automated Test Suite Passes**:
   ```bash
   npm test
   ```
   All tests in `tests/testRunner.js` must pass with `0` failures.
2. **Production Bundle Verification**:
   ```bash
   npm run build
   ```
   Must compile without a single error or warning.
3. **Manual Validation**: High-impact UI updates or live streaming changes must be manually validated in a real browser context.

---

## 4. Documentation & Release Lifecycle

Whenever a new minor or major version is proposed:
1. **Status Update**: The `/docs/IMPLEMENTATION_STATUS.md` tracker must be fully updated with completion dates.
2. **Architecture Update**: Modify `ARCHITECTURE.md` to reflect new components, network flows, and API layers.
3. **Changelog Tracking**: Record all additions, improvements, and fixes in `CHANGELOG.md` in keeping with Keep a Changelog formatting.
