import { Router } from 'express';
import healthEngine from '../monitoring/healthEngine.js';
import deviceStore from '../aggregator/deviceStore.js';
import logger from '../logger/structuredLogger.js';

const router = Router();
const DEFAULT_INTERVAL_MS = 30_000;

/**
 * POST /api/v1/monitor/start/:id
 * Starts health monitoring for a specific camera.
 * The device must be in the current session's DeviceStore.
 */
router.post('/start/:id', (req, res) => {
  const { id } = req.params;
  const { intervalMs } = req.body;

  const device = deviceStore.find(id);
  if (!device) {
    return res.status(404).json({
      success: false,
      error: `Device '${id}' not found in active session. Run a scan first.`
    });
  }

  if (!device.ip) {
    return res.status(400).json({ success: false, error: 'Device has no IP address.' });
  }

  const knownPorts = (device.openPorts || []).map(p => p.port);
  const interval = Number(intervalMs) || DEFAULT_INTERVAL_MS;

  healthEngine.startMonitoring(id, device.ip, knownPorts, interval);
  logger.info(`[MonitoringRouter] Started monitoring for ${id} (${device.ip})`);

  res.json({
    success: true,
    message: `Health monitoring started for ${device.ip}`,
    cameraId: id,
    intervalMs: interval,
  });
});

/**
 * POST /api/v1/monitor/stop/:id
 * Stops health monitoring for a specific camera.
 */
router.post('/stop/:id', (req, res) => {
  const { id } = req.params;

  if (!healthEngine.isMonitoring(id)) {
    return res.status(400).json({
      success: false,
      error: `Camera '${id}' is not currently being monitored.`
    });
  }

  healthEngine.stopMonitoring(id);
  res.json({ success: true, message: `Health monitoring stopped for ${id}` });
});

/**
 * GET /api/v1/monitor/status/:id
 * Returns the current health snapshot and event timeline for a camera.
 */
router.get('/status/:id', (req, res) => {
  const { id } = req.params;
  const snapshot = healthEngine.getSnapshot(id);
  const events = healthEngine.getEvents(id);
  const active = healthEngine.isMonitoring(id);

  res.json({
    success: true,
    cameraId: id,
    monitoring: active,
    snapshot,
    events,
  });
});

export default router;
