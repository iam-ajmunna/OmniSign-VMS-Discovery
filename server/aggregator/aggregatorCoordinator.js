import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import deviceStore from './deviceStore.js';
import deviceDeduplicator from './deviceDeduplicator.js';
import deviceMerger from './deviceMerger.js';
import vendorResolver from '../services/vendorResolver.js';
import portIdentifier from '../services/portIdentifier.js';
import confidenceCalculator from '../services/confidenceCalculator.js';

/**
 * Aggregator Coordinator Service.
 * Listens for discovery events, deduplicates entries, merges multi-protocol payloads,
 * and updates the in-memory device store.
 */
class AggregatorCoordinator {
  constructor() {
    this.handleDeviceFound = this.handleDeviceFound.bind(this);
    this.initialized = false;
  }

  /**
   * Initializes event listeners on the event bus.
   */
  init() {
    if (this.initialized) return;
    eventBus.on(Events.DEVICE_FOUND, this.handleDeviceFound);
    this.initialized = true;
    logger.info('AggregatorCoordinator: Event bus listener initialized.');
  }

  /**
   * Processes incoming DEVICE_FOUND raw scanner signals.
   * @param {import('../models/device.js').DiscoveredDevice} incomingDevice 
   */
  handleDeviceFound(incomingDevice) {
    if (!incomingDevice || (!incomingDevice.ip && !incomingDevice.mac)) {
      return;
    }

    // 1. Look for existing device record match
    const existing = deviceDeduplicator.findMatch(incomingDevice);

    if (existing) {
      // 2a. Merge properties into existing device
      const merged = deviceMerger.merge(existing, incomingDevice);
      deviceStore.update(existing.id, merged);
    } else {
      // 2b. Create new device entry
      const mac = incomingDevice.mac || null;
      let vendor = incomingDevice.vendor || null;
      if (mac && !vendor) {
        vendor = vendorResolver.resolveVendor(mac);
      }

      const openPorts = (incomingDevice.openPorts || []).map(p => {
        const info = portIdentifier.identifyPort(p.port);
        return { ...p, service: info.service, name: info.name };
      });

      const isCam = incomingDevice.isCamera || 
        vendorResolver.isCameraVendor(vendor) ||
        portIdentifier.hasCameraPorts(openPorts);

      const id = mac 
        ? mac.toLowerCase().replace(/[:-]/g, '') 
        : `ip_${incomingDevice.ip.replace(/\./g, '_')}`;

      const newDevice = {
        id,
        ip: incomingDevice.ip,
        mac,
        hostname: incomingDevice.hostname || null,
        vendor,
        isCamera: isCam,
        model: incomingDevice.model || null,
        discoveryMethods: incomingDevice.discoveryMethods || [],
        openPorts,
        confidence: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        rawPayloads: incomingDevice.rawPayloads || {}
      };

      // Calculate initial confidence
      newDevice.confidence = confidenceCalculator.calculateConfidence(newDevice);

      deviceStore.add(newDevice);
    }
  }

  /**
   * Destroys event bus listeners.
   */
  destroy() {
    eventBus.off(Events.DEVICE_FOUND, this.handleDeviceFound);
    this.initialized = false;
  }
}

const aggregatorCoordinator = new AggregatorCoordinator();
export default aggregatorCoordinator;
