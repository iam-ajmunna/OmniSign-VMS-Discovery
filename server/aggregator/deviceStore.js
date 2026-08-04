import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';

/**
 * Thread-safe, in-memory volatile cache storing scan session discoveries.
 * Decouples discovery merging and deduplication logic from database engines.
 */
class DeviceStore {
  constructor() {
    /** @type {Map<string, import('../models/device.js').DiscoveredDevice>} */
    this.devices = new Map();
  }

  /**
   * Resets the store registry.
   */
  clear() {
    this.devices.clear();
    logger.debug('DeviceStore cache flushed.');
  }

  /**
   * Adds a new device node to the in-memory cache and broadcasts updates.
   * @param {import('../models/device.js').DiscoveredDevice} device 
   */
  add(device) {
    if (!device.id) {
      logger.error('Failed to add device to store: missing device ID.', device);
      return;
    }
    this.devices.set(device.id, device);
    eventBus.emit(Events.DEVICE_UPDATED, device);
  }

  /**
   * Updates property sets on an existing cached device.
   * @param {string} id - Device ID
   * @param {Partial<import('../models/device.js').DiscoveredDevice>} updates - Changed values
   */
  update(id, updates) {
    const existing = this.devices.get(id);
    if (!existing) {
      logger.warn(`Attempted to update device ${id} but it was not found in cache.`);
      return;
    }

    // Promote key from ip_... to normalized MAC string if MAC becomes available
    const mac = updates.mac || existing.mac;
    const targetId = mac ? mac.toLowerCase().replace(/[:-]/g, '') : id;

    const updated = {
      ...existing,
      ...updates,
      id: targetId,
      mac,
      lastSeen: new Date().toISOString(),
      discoveryMethods: Array.from(new Set([...(existing.discoveryMethods || []), ...(updates.discoveryMethods || [])])),
      openPorts: mergePorts(existing.openPorts || [], updates.openPorts || []),
      rawPayloads: {
        ...(existing.rawPayloads || {}),
        ...(updates.rawPayloads || {})
      }
    };

    if (targetId !== id) {
      this.devices.delete(id);
    }

    this.devices.set(targetId, updated);
    eventBus.emit(Events.DEVICE_UPDATED, updated);
  }

  /**
   * Removes a device node by ID.
   * @param {string} id 
   */
  remove(id) {
    this.devices.delete(id);
  }

  /**
   * Finds a device by its unique ID.
   * @param {string} id 
   * @returns {import('../models/device.js').DiscoveredDevice|undefined}
   */
  find(id) {
    return this.devices.get(id);
  }

  /**
   * Resolves a device by matching IP.
   * @param {string} ip 
   * @returns {import('../models/device.js').DiscoveredDevice|undefined}
   */
  findByIp(ip) {
    return Array.from(this.devices.values()).find(dev => dev.ip === ip);
  }

  /**
   * Resolves a device by matching normalized MAC address.
   * @param {string} mac 
   * @returns {import('../models/device.js').DiscoveredDevice|undefined}
   */
  findByMac(mac) {
    if (!mac) return undefined;
    const normMac = mac.toLowerCase().replace(/-/g, ':');
    return Array.from(this.devices.values()).find(dev => 
      dev.mac && dev.mac.toLowerCase().replace(/-/g, ':') === normMac
    );
  }

  /**
   * Exports cache as standard Array elements.
   * @returns {import('../models/device.js').DiscoveredDevice[]}
   */
  getAll() {
    return Array.from(this.devices.values());
  }
}

/**
 * Merges two open port sets, preventing duplicates.
 * @param {Array} existingPorts 
 * @param {Array} newPorts 
 */
function mergePorts(existingPorts, newPorts) {
  const merged = new Map();
  existingPorts.forEach(p => merged.set(p.port, p));
  newPorts.forEach(p => merged.set(p.port, p));
  return Array.from(merged.values());
}

const deviceStore = new DeviceStore();
export default deviceStore;
