import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import metricsCollector from './metricsCollector.js';
import healthScheduler from './healthScheduler.js';
import eventManager, { EventType } from './eventManager.js';

/**
 * Camera Health Engine — central orchestrator.
 *
 * Responsibilities:
 *  1. Accept start/stop monitoring commands per camera
 *  2. Schedule recurring metric collection via healthScheduler
 *  3. Collect a full CameraHealthSnapshot on each tick
 *  4. Detect status transitions (online → offline, etc.)
 *  5. Record meaningful events via eventManager
 *  6. Broadcast the snapshot to SSE clients via eventBus
 *
 * The Health Engine contains NO UI logic.
 * All state lives in this module; the frontend is purely reactive.
 */

/** @type {Map<string, import('./metricsCollector.js').CameraHealthSnapshot>} */
const snapshots = new Map();

/** @type {Map<string, {overall: string, stream: string, onvif: string}>} cameraId → previous statuses */
const previousStatus = new Map();

const DEFAULT_INTERVAL_MS = 30_000; // 30 second health check cycle

/**
 * Starts health monitoring for a camera.
 * @param {string} cameraId
 * @param {string} ip
 * @param {number[]} [knownPorts]
 * @param {number} [intervalMs]
 */
function startMonitoring(cameraId, ip, knownPorts = [], intervalMs = DEFAULT_INTERVAL_MS) {
  if (healthScheduler.isActive(cameraId)) {
    logger.debug(`[HealthEngine] Already monitoring ${cameraId}, skipping duplicate start.`);
    return;
  }

  logger.info(`[HealthEngine] Starting health monitoring for camera ${cameraId} (${ip})`);
  eventManager.record(cameraId, EventType.MONITORING_STARTED, `Health monitoring started for ${ip}`);

  healthScheduler.start(cameraId, () => runCheck(cameraId, ip, knownPorts), intervalMs);
}

/**
 * Stops health monitoring for a camera and cleans up resources.
 * @param {string} cameraId
 */
function stopMonitoring(cameraId) {
  if (!healthScheduler.isActive(cameraId)) return;

  logger.info(`[HealthEngine] Stopping health monitoring for camera ${cameraId}`);
  healthScheduler.stop(cameraId);
  eventManager.record(cameraId, EventType.MONITORING_STOPPED, 'Health monitoring stopped');
  previousStatus.delete(cameraId);
}

/**
 * Executes a single health check cycle for a camera.
 * @param {string} cameraId
 * @param {string} ip
 * @param {number[]} knownPorts
 */
async function runCheck(cameraId, ip, knownPorts) {
  try {
    const snapshot = await metricsCollector.collect(cameraId, ip, knownPorts);
    const prev = previousStatus.get(cameraId) || {};
    const curr = {
      overall: snapshot.overall,
      stream: snapshot.stream.status,
      onvif: snapshot.onvif.status
    };

    // Detect and record status transitions
    if (prev.overall !== undefined && prev.overall !== curr.overall) {
      if (curr.overall === 'online') {
        eventManager.record(cameraId, EventType.CAMERA_ONLINE, `Camera ${ip} came online (latency: ${snapshot.network.latencyMs}ms)`);
      } else if (curr.overall === 'offline') {
        eventManager.record(cameraId, EventType.CAMERA_OFFLINE, `Camera ${ip} went offline — unreachable on all probed ports`);
      } else if (curr.overall === 'degraded') {
        eventManager.record(cameraId, EventType.HEALTH_WARNING, `Camera ${ip} is responding slowly (${snapshot.network.latencyMs}ms)`);
      }
    } else if (prev.overall === undefined) {
      // First check — record initial state
      if (curr.overall === 'online') {
        eventManager.record(cameraId, EventType.CAMERA_ONLINE, `Camera ${ip} is online (latency: ${snapshot.network.latencyMs}ms)`);
      } else {
        eventManager.record(cameraId, EventType.CAMERA_OFFLINE, `Camera ${ip} is offline or unreachable`);
      }
    }

    if (prev.stream !== undefined && prev.stream !== curr.stream) {
      if (curr.stream === 'healthy') {
        eventManager.record(cameraId, EventType.STREAM_CONNECTED, `RTSP stream connected on port ${snapshot.stream.port}`);
      } else if (curr.stream === 'offline') {
        eventManager.record(cameraId, EventType.RTSP_LOST, `RTSP stream disconnected`);
      }
    }

    if (prev.onvif !== undefined && prev.onvif !== curr.onvif) {
      if (curr.onvif === 'healthy') {
        eventManager.record(cameraId, EventType.STREAM_CONNECTED, `ONVIF service connected on port ${snapshot.onvif.port}`);
      } else if (curr.onvif === 'offline') {
        eventManager.record(cameraId, EventType.ONVIF_LOST, `ONVIF service disconnected`);
      }
    }

    previousStatus.set(cameraId, curr);
    snapshots.set(cameraId, snapshot);

    // Broadcast snapshot + events to all SSE clients
    eventBus.emit(Events.HEALTH_UPDATE, {
      cameraId,
      snapshot,
      events: eventManager.getEvents(cameraId),
    });

  } catch (err) {
    logger.error(`[HealthEngine] Check failed for ${cameraId}: ${err.message}`);
  }
}

/**
 * Returns the latest health snapshot for a camera.
 * @param {string} cameraId
 * @returns {import('./metricsCollector.js').CameraHealthSnapshot|null}
 */
function getSnapshot(cameraId) {
  return snapshots.get(cameraId) ?? null;
}

/**
 * Returns all event log entries for a camera.
 * @param {string} cameraId
 * @returns {Array}
 */
function getEvents(cameraId) {
  return eventManager.getEvents(cameraId);
}

/**
 * Returns whether a camera is currently monitored.
 * @param {string} cameraId
 * @returns {boolean}
 */
function isMonitoring(cameraId) {
  return healthScheduler.isActive(cameraId);
}

/**
 * Graceful shutdown — stops all timers.
 */
function shutdown() {
  healthScheduler.stopAll();
}

export default {
  startMonitoring,
  stopMonitoring,
  runCheck,
  getSnapshot,
  getEvents,
  isMonitoring,
  shutdown,
};
