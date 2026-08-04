/**
 * Per-camera event timeline manager.
 * Maintains an ordered, bounded in-memory event log for each monitored camera.
 * Events are emitted on the Node.js eventBus so SSE can broadcast them.
 */

import { randomUUID } from 'crypto';
import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';

const MAX_EVENTS_PER_CAMERA = 200;

/** @type {Map<string, Array>} cameraId → events[] */
const eventLogs = new Map();

/**
 * Supported event type constants.
 */
export const EventType = Object.freeze({
  CAMERA_ONLINE:        'camera_online',
  CAMERA_OFFLINE:       'camera_offline',
  STREAM_CONNECTED:     'stream_connected',
  STREAM_LOST:          'stream_lost',
  AUTH_FAILED:          'auth_failed',
  RTSP_LOST:            'rtsp_lost',
  ONVIF_LOST:           'onvif_lost',
  HEALTH_WARNING:       'health_warning',
  HEALTH_RECOVERED:     'health_recovered',
  MONITORING_STARTED:   'monitoring_started',
  MONITORING_STOPPED:   'monitoring_stopped',
  IP_CHANGED:           'ip_changed',
  FIRMWARE_CHANGED:     'firmware_changed',
});

const SEVERITY_MAP = {
  [EventType.CAMERA_ONLINE]:      'success',
  [EventType.CAMERA_OFFLINE]:     'error',
  [EventType.STREAM_CONNECTED]:   'success',
  [EventType.STREAM_LOST]:        'error',
  [EventType.AUTH_FAILED]:        'error',
  [EventType.RTSP_LOST]:          'warning',
  [EventType.ONVIF_LOST]:         'warning',
  [EventType.HEALTH_WARNING]:     'warning',
  [EventType.HEALTH_RECOVERED]:   'success',
  [EventType.MONITORING_STARTED]: 'info',
  [EventType.MONITORING_STOPPED]: 'info',
  [EventType.IP_CHANGED]:         'warning',
  [EventType.FIRMWARE_CHANGED]:   'info',
};

/**
 * Records a camera event and emits it on the event bus.
 * @param {string} cameraId
 * @param {string} type - One of EventType constants
 * @param {string} [message] - Human-readable description
 * @param {Object} [meta] - Optional metadata payload
 */
function record(cameraId, type, message, meta = {}) {
  if (!eventLogs.has(cameraId)) {
    eventLogs.set(cameraId, []);
  }

  const events = eventLogs.get(cameraId);
  const entry = {
    id: randomUUID(),
    cameraId,
    type,
    severity: SEVERITY_MAP[type] ?? 'info',
    message: message ?? type.replace(/_/g, ' '),
    timestamp: new Date().toISOString(),
    meta,
  };

  events.push(entry);

  // Enforce max log size (FIFO trim)
  if (events.length > MAX_EVENTS_PER_CAMERA) {
    events.shift();
  }

  eventBus.emit(Events.CAMERA_EVENT, { cameraId, event: entry });
  return entry;
}

/**
 * Returns all recorded events for a camera.
 * @param {string} cameraId
 * @returns {Array}
 */
function getEvents(cameraId) {
  return eventLogs.get(cameraId) ?? [];
}

/**
 * Clears the event log for a camera.
 * @param {string} cameraId
 */
function clearEvents(cameraId) {
  eventLogs.delete(cameraId);
}

export default { record, getEvents, clearEvents, EventType };
