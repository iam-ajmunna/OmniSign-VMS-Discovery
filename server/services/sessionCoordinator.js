import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import deviceStore from '../aggregator/deviceStore.js';
import scannerRegistry from '../registry/scannerRegistry.js';
import { Settings, getActiveInterface } from '../config/index.js';
import aggregatorCoordinator from '../aggregator/aggregatorCoordinator.js';

class SessionCoordinator {
  constructor() {
    /** @type {import('../models/scanSession.js').ScanSession|null} */
    this.activeSession = null;
    
    /** @type {AbortController|null} */
    this.abortController = null;
    
    /** @type {NodeJS.Timeout|null} */
    this.timeoutId = null;

    /** @type {NodeJS.Timeout|null} */
    this.durationTrackerId = null;

    // Initialize Milestone 5 Aggregation Pipeline Listener
    aggregatorCoordinator.init();
  }

  /**
   * Initiates a new network scan session and executes registered scanners concurrently.
   * Enforces scanning locks to prevent concurrent executions.
   * 
   * @returns {import('../models/scanSession.js').ScanSession} The created session object
   */
  startScan() {
    if (this.activeSession) {
      logger.warn('Scan start rejected: another session is currently running.');
      throw new Error('A scan session is already in progress.');
    }

    const activeInterface = getActiveInterface();
    logger.info(`SessionCoordinator: Selected network interface ${activeInterface.interfaceName} (${activeInterface.ip})`);
    
    this.activeSession = {
      id: `session_${Math.random().toString(36).substring(2, 11)}`,
      status: 'running',
      startTime: new Date().toISOString(),
      endTime: null,
      durationMs: 0,
      stats: {
        totalDiscovered: 0,
        camerasCount: 0,
        protocolHits: {}
      }
    };

    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    
    // Flush the device store cache
    deviceStore.clear();

    logger.info(`SessionCoordinator: Initiated new scan session ID: ${this.activeSession.id}`);
    eventBus.emit(Events.SCAN_STARTED, this.activeSession);

    // Setup active duration tracker polling
    const startTimeMs = Date.now();
    this.durationTrackerId = setInterval(() => {
      if (this.activeSession) {
        this.activeSession.durationMs = Date.now() - startTimeMs;
      }
    }, 100);

    // Setup safety timeout to abort scans exceeding default run limits (35s)
    const timeoutVal = Settings.defaultScanTimeoutMs || 35000;
    this.timeoutId = setTimeout(() => {
      if (this.activeSession && this.activeSession.status === 'running') {
        logger.warn(`Scan Session ${this.activeSession.id} exceeded safety timeout limit. Auto aborting.`);
        this.cancelScan();
      }
    }, timeoutVal);

    // Get active scanner modules
    const activeScanners = scannerRegistry.getActiveScanners();
    logger.info(`SessionCoordinator: Launching ${activeScanners.length} active scanners in parallel...`);

    const scanPromises = activeScanners.map(async (scanner) => {
      const startTime = Date.now();
      try {
        logger.debug(`SessionCoordinator: Dispatching scanner: ${scanner.name}`);
        await scanner.execute(activeInterface.ip, signal);
        const duration = Date.now() - startTime;
        logger.info(`[Metrics] Scanner ${scanner.name} completed in ${duration}ms.`);
      } catch (err) {
        const duration = Date.now() - startTime;
        logger.error(`[Metrics] Scanner ${scanner.name} failed after ${duration}ms: ${err.message}`);
        eventBus.emit(Events.SCANNER_ERROR, { name: scanner.name, error: err.message });
      }
    });

    // Wait for all scanners to complete or fail
    Promise.allSettled(scanPromises).then(async () => {
      if (this.activeSession && this.activeSession.status === 'running') {
        // Run a quick post-sweep ARP refresh to capture MAC addresses of all newly pinged IPs
        const arpScanner = scannerRegistry.getScanner('ARP');
        if (arpScanner && !signal.aborted) {
          logger.info('SessionCoordinator: Running post-sweep ARP refresh to resolve host MACs...');
          try {
            await arpScanner.execute(activeInterface.ip, signal);
          } catch (e) {
            // Ignore refresh errors
          }
        }
        this.completeScan();
      }
    });

    return this.activeSession;
  }

  /**
   * Aborts the active scan session dynamically.
   * Triggers abort signal listeners to close open ports/sockets.
   */
  cancelScan() {
    if (!this.activeSession) {
      logger.warn('Scan cancellation request rejected: no active session to cancel.');
      throw new Error('No active scan session to cancel.');
    }

    logger.warn(`SessionCoordinator: Cancelling Scan Session: ${this.activeSession.id}`);
    
    // Cancel scanners via AbortController signal
    if (this.abortController) {
      this.abortController.abort();
    }

    this.cleanupSession('cancelled');
  }

  /**
   * Finalizes the scan session as completed.
   */
  completeScan() {
    if (!this.activeSession) return;
    
    logger.info(`SessionCoordinator: Completed Scan Session: ${this.activeSession.id}`);
    this.cleanupSession('completed');
  }

  /**
   * Cleans up timers and updates session values.
   * @param {string} endStatus - State to set: "completed" | "cancelled" | "failed"
   */
  cleanupSession(endStatus) {
    if (!this.activeSession) return;

    // Clear timers
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.durationTrackerId) {
      clearInterval(this.durationTrackerId);
      this.durationTrackerId = null;
    }

    // Capture stats from store
    const foundDevices = deviceStore.getAll();
    
    this.activeSession.status = endStatus;
    this.activeSession.endTime = new Date().toISOString();
    this.activeSession.stats.totalDiscovered = foundDevices.length;
    // Camera filter placeholder (will use score-calculator in Milestone 6)
    this.activeSession.stats.camerasCount = foundDevices.length; 

    // Calculate dynamic hits based on discovery methods
    const hits = {};
    foundDevices.forEach(dev => {
      dev.discoveryMethods.forEach(method => {
        hits[method] = (hits[method] || 0) + 1;
      });
    });
    this.activeSession.stats.protocolHits = hits;

    // Broadcast change
    const finishedSession = { ...this.activeSession };
    
    if (endStatus === 'cancelled') {
      eventBus.emit(Events.SCAN_CANCELLED, finishedSession);
    } else {
      eventBus.emit(Events.SCAN_FINISHED, finishedSession);
    }

    // Reset core handles
    this.activeSession = null;
    this.abortController = null;
  }

  /**
   * Checks if a scan session is currently executing.
   * @returns {boolean}
   */
  isScanning() {
    return this.activeSession !== null;
  }

  /**
   * Returns current session metadata or null.
   * @returns {import('../models/scanSession.js').ScanSession|null}
   */
  getActiveSession() {
    return this.activeSession;
  }

  /**
   * Returns the AbortSignal token for currently executing scanners.
   * @returns {AbortSignal|null}
   */
  getAbortSignal() {
    return this.abortController ? this.abortController.signal : null;
  }
}

const sessionCoordinator = new SessionCoordinator();
export default sessionCoordinator;
