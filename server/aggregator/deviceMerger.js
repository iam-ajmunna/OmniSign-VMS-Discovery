import vendorResolver from '../services/vendorResolver.js';
import portIdentifier from '../services/portIdentifier.js';
import confidenceCalculator from '../services/confidenceCalculator.js';

/**
 * Property merger service for consolidating multi-protocol scanner hits into unified device models.
 */
export default {
  /**
   * Merges incoming scanner data into an existing device record.
   * 
   * @param {import('../models/device.js').DiscoveredDevice} existing 
   * @param {Partial<import('../models/device.js').DiscoveredDevice>} incoming 
   * @returns {import('../models/device.js').DiscoveredDevice} Consolidated updated device
   */
  merge(existing, incoming) {
    const mac = existing.mac || incoming.mac || null;
    
    // Resolve vendor if missing
    let vendor = existing.vendor || incoming.vendor || null;
    if (mac && !vendor) {
      vendor = vendorResolver.resolveVendor(mac);
    }

    // Merge discovery methods without duplicates
    const discoveryMethods = Array.from(new Set([
      ...(existing.discoveryMethods || []),
      ...(incoming.discoveryMethods || [])
    ]));

    // Merge open ports without duplicates
    const portMap = new Map();
    (existing.openPorts || []).forEach(p => {
      const info = portIdentifier.identifyPort(p.port);
      portMap.set(p.port, { ...p, service: info.service, name: info.name });
    });
    (incoming.openPorts || []).forEach(p => {
      const info = portIdentifier.identifyPort(p.port);
      portMap.set(p.port, { ...p, service: info.service, name: info.name });
    });
    const openPorts = Array.from(portMap.values());

    // Resolve hostname & model priorities
    const hostname = incoming.hostname || existing.hostname || null;
    const model = incoming.model || existing.model || null;

    // Evaluate camera status
    const isCam = (incoming.isCamera !== undefined ? incoming.isCamera : existing.isCamera) ||
      vendorResolver.isCameraVendor(vendor) ||
      portIdentifier.hasCameraPorts(openPorts);

    // Combine raw payload objects
    const rawPayloads = {
      ...(existing.rawPayloads || {}),
      ...(incoming.rawPayloads || {})
    };

    const merged = {
      ...existing,
      ...incoming,
      mac,
      vendor,
      model,
      hostname,
      isCamera: isCam,
      discoveryMethods,
      openPorts,
      rawPayloads,
      lastSeen: new Date().toISOString()
    };

    // Dynamically compute confidence score based on merged metrics
    merged.confidence = confidenceCalculator.calculateConfidence(merged);

    return merged;
  }
};
