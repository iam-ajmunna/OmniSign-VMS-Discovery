/**
 * Centralized registry of application Event constants.
 * Prevents scattered string literals and minimizes typos.
 */
export const Events = Object.freeze({
  // Scan Session Lifecycle
  SCAN_STARTED: 'scan:started',
  SCAN_FINISHED: 'scan:finished',
  SCAN_CANCELLED: 'scan:cancelled',

  // Protocol Scanners Lifecycle
  SCANNER_STARTED: 'scanner:started',
  SCANNER_PROGRESS: 'scanner:progress',
  SCANNER_FINISHED: 'scanner:finished',
  SCANNER_ERROR: 'scanner:error',

  // Device Mutation/Discovery Events
  DEVICE_FOUND: 'device:found',
  DEVICE_UPDATED: 'device:updated',
  DEVICE_REMOVED: 'device:removed',

  // Telemetry Log Broadcast
  LOG_EMITTED: 'log:emitted'
});
