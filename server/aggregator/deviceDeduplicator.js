import deviceStore from './deviceStore.js';
import logger from '../logger/structuredLogger.js';

/**
 * Deduplication service for network discovery events.
 * Resolves whether a candidate device matches an existing record in cache.
 */
export default {
  /**
   * Resolves duplicate matches by MAC address primary, falling back to IP address.
   * 
   * @param {import('../models/device.js').DiscoveredDevice} candidate 
   * @returns {import('../models/device.js').DiscoveredDevice|null} Existing device or null
   */
  findMatch(candidate) {
    if (!candidate) return null;

    // 1. Match by MAC address (highest authority)
    if (candidate.mac) {
      const matchByMac = deviceStore.findByMac(candidate.mac);
      if (matchByMac) {
        logger.debug(`[Deduplicator] Matched candidate ${candidate.ip} to existing node ${matchByMac.id} via MAC (${candidate.mac})`);
        return matchByMac;
      }
    }

    // 2. Fallback: Match by IP address
    if (candidate.ip) {
      const matchByIp = deviceStore.findByIp(candidate.ip);
      if (matchByIp) {
        logger.debug(`[Deduplicator] Matched candidate ${candidate.ip} to existing node ${matchByIp.id} via IP`);
        return matchByIp;
      }
    }

    return null;
  }
};
