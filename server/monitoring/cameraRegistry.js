import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger/structuredLogger.js';

/**
 * File-based camera registry.
 * Persists discovered camera identities across server restarts.
 * The DeviceStore is volatile (session-only); this registry is permanent.
 *
 * Storage: server/data/camera_registry.json
 * Format:  { [cameraId]: { ...device, registeredAt, lastSeenAt } }
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.join(__dirname, '../data/camera_registry.json');

// Ensure data directory exists
const dataDir = path.dirname(REGISTRY_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

/** @type {Map<string, object>} */
let registry = new Map();

// Load existing registry from disk on module init
function load() {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const raw = fs.readFileSync(REGISTRY_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      registry = new Map(Object.entries(parsed));
      logger.debug(`[CameraRegistry] Loaded ${registry.size} camera(s) from registry.`);
    }
  } catch (err) {
    logger.warn(`[CameraRegistry] Failed to load registry: ${err.message}. Starting fresh.`);
    registry = new Map();
  }
}

function save() {
  try {
    const obj = Object.fromEntries(registry);
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    logger.error(`[CameraRegistry] Failed to save registry: ${err.message}`);
  }
}

/**
 * Registers (or updates) a camera in the persistent registry.
 * @param {object} device - DiscoveredDevice from DeviceStore
 */
function register(device) {
  if (!device?.id) return;

  const existing = registry.get(device.id);
  registry.set(device.id, {
    ...device,
    registeredAt: existing?.registeredAt || new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
  });

  save();
  logger.debug(`[CameraRegistry] Registered camera ${device.id} (${device.ip})`);
}

/**
 * Retrieves a camera by ID from the registry.
 * @param {string} id
 * @returns {object|null}
 */
function get(id) {
  return registry.get(id) ?? null;
}

/**
 * Returns all registered cameras.
 * @returns {object[]}
 */
function getAll() {
  return Array.from(registry.values());
}

/**
 * Returns whether a camera is registered.
 * @param {string} id
 */
function has(id) {
  return registry.has(id);
}

// Initialize on import
load();

export default { register, get, getAll, has };
