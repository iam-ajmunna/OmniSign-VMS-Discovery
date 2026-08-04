import { Router } from 'express';
import deviceStore from '../aggregator/deviceStore.js';

const router = Router();

/**
 * GET /api/v1/devices
 * Returns all currently known devices from the in-memory store.
 */
router.get('/', (req, res) => {
  const devices = deviceStore.getAll();
  res.json({ success: true, count: devices.length, devices });
});

/**
 * GET /api/v1/devices/:id
 * Returns a single device by its normalized ID (MAC hex string or IP key).
 */
router.get('/:id', (req, res) => {
  const device = deviceStore.find(req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, error: `Device '${req.params.id}' not found in current session.` });
  }
  res.json({ success: true, device });
});

export default router;
