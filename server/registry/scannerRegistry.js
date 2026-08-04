import arpScanner from '../scanners/arp.js';
import pingScanner from '../scanners/ping.js';
import ssdpScanner from '../scanners/ssdp.js';
import mdnsScanner from '../scanners/mdns.js';
import onvifScanner from '../scanners/onvif.js';

/**
 * Explicit registry loader. Exposes structured scanner modules.
 * This completely avoids file crawling, making builds clean and bundling robust.
 */
class ScannerRegistry {
  constructor() {
    this.scanners = [
      arpScanner,
      pingScanner,
      ssdpScanner,
      mdnsScanner,
      onvifScanner
    ];
  }

  /**
   * Returns all registered discovery scanner modules.
   * @returns {Array} List of scanners
   */
  getScanners() {
    return this.scanners;
  }

  /**
   * Returns only active (enabled) discovery scanner modules.
   * @returns {Array} List of active scanners
   */
  getActiveScanners() {
    return this.scanners.filter(scanner => scanner.enabled);
  }

  /**
   * Retrieves a specific scanner by its unique name/protocol.
   * @param {string} name - Scanner name
   * @returns {Object|undefined} Scanner module
   */
  getScanner(name) {
    return this.scanners.find(scanner => scanner.name === name);
  }
}

const scannerRegistry = new ScannerRegistry();
export default scannerRegistry;
