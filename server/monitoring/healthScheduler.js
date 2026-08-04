import logger from '../logger/structuredLogger.js';

/**
 * Per-camera health check scheduler.
 * Manages interval timers without leaks: each camera gets exactly one timer.
 * All timers are unref()'d so they don't prevent the Node.js event loop
 * from exiting cleanly on SIGTERM.
 */

/** @type {Map<string, NodeJS.Timeout>} cameraId → timer handle */
const timers = new Map();

/**
 * Starts a recurring health check for a camera.
 * If a timer already exists for this camera it is replaced.
 * @param {string} cameraId
 * @param {() => Promise<void>} checkFn - Async function to run on each tick
 * @param {number} [intervalMs=30000] - Check frequency (default 30s)
 */
function start(cameraId, checkFn, intervalMs = 30_000) {
  stop(cameraId); // Clear any existing timer first

  logger.debug(`[HealthScheduler] Starting monitor for ${cameraId} (interval: ${intervalMs}ms)`);

  // Run immediately on start, then on interval
  checkFn().catch(err => logger.error(`[HealthScheduler] Check error for ${cameraId}: ${err.message}`));

  const timer = setInterval(() => {
    checkFn().catch(err => logger.error(`[HealthScheduler] Check error for ${cameraId}: ${err.message}`));
  }, intervalMs);

  // Unref so the timer doesn't block graceful shutdown
  timer.unref();
  timers.set(cameraId, timer);
}

/**
 * Stops the recurring health check timer for a camera.
 * @param {string} cameraId
 */
function stop(cameraId) {
  const existing = timers.get(cameraId);
  if (existing) {
    clearInterval(existing);
    timers.delete(cameraId);
    logger.debug(`[HealthScheduler] Stopped monitor for ${cameraId}`);
  }
}

/**
 * Stops all active timers. Called during graceful shutdown.
 */
function stopAll() {
  for (const [id, timer] of timers) {
    clearInterval(timer);
    logger.debug(`[HealthScheduler] Timer cleaned up for ${id}`);
  }
  timers.clear();
}

/**
 * Returns the set of actively monitored camera IDs.
 * @returns {string[]}
 */
function activeIds() {
  return Array.from(timers.keys());
}

/**
 * Returns whether a camera is currently being monitored.
 * @param {string} cameraId
 * @returns {boolean}
 */
function isActive(cameraId) {
  return timers.has(cameraId);
}

export default { start, stop, stopAll, activeIds, isActive };
