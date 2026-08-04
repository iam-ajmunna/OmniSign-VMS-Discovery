import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vendorResolver from './vendorResolver.js';
import portIdentifier from './portIdentifier.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fpPath = path.join(__dirname, '../database/fingerprints.json');

let fingerprints = {};
try {
  fingerprints = JSON.parse(fs.readFileSync(fpPath, 'utf8'));
} catch (e) {
  // Fallback
}

/**
 * Service for calculating dynamic 0-99% camera certainty confidence ratings using multi-protocol fingerprints.
 */
export default {
  /**
   * Calculates dynamic camera confidence score for a device node based on multi-protocol evidence.
   * @param {import('../models/device.js').DiscoveredDevice} device 
   * @returns {number} Confidence score percentage (0 - 99)
   */
  calculateConfidence(device) {
    if (!device) return 0;

    let score = 30; // Base score for responsive LAN endpoint

    // 1. IEEE OUI Vendor Match (+35%)
    if (device.vendor && vendorResolver.isCameraVendor(device.vendor)) {
      score += 35;
    }

    // 2. Open Camera Ports (+25%)
    if (portIdentifier.hasCameraPorts(device.rawPayloads?.openPorts || device.openPorts)) {
      score += 25;
    }

    // 3. ONVIF Protocol Probe Hit (+20%)
    if (device.discoveryMethods && device.discoveryMethods.includes('ONVIF')) {
      score += 20;
    }

    // 4. Protocol Fingerprint Matching (SSDP, mDNS, ONVIF)
    const rawPayloadsStr = JSON.stringify(device.rawPayloads || {}).toLowerCase();
    
    if (fingerprints.ssdpHeaders) {
      for (const fp of fingerprints.ssdpHeaders) {
        if (rawPayloadsStr.includes(fp.pattern.toLowerCase())) {
          score += fp.confidenceBonus || 15;
          break;
        }
      }
    }

    if (fingerprints.mdnsServices) {
      for (const fp of fingerprints.mdnsServices) {
        if (rawPayloadsStr.includes(fp.pattern.toLowerCase())) {
          score += fp.confidenceBonus || 15;
          break;
        }
      }
    }

    // 5. Hostname & Model Keywords (+15%)
    const textStr = ((device.hostname || '') + ' ' + (device.model || '')).toLowerCase();
    const cameraKeywords = ['camera', 'ipc', 'netcam', 'onvif', 'rtsp', 'nvr', 'dvr'];
    if (cameraKeywords.some(k => textStr.includes(k))) {
      score += 15;
    }

    // Explicit flag bonus
    if (device.isCamera) {
      score += 10;
    }

    // Cap score at 99% max
    return Math.min(Math.max(score, 10), 99);
  }
};
