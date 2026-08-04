import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ouiPath = path.join(__dirname, '../database/ieee_oui.json');
const vendorsPath = path.join(__dirname, '../database/camera_vendors.json');

let ouiDatabase = {};
let cameraVendorsDatabase = {};

try {
  ouiDatabase = JSON.parse(fs.readFileSync(ouiPath, 'utf8'));
  cameraVendorsDatabase = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));
} catch (err) {
  console.error('Failed to load Camera Vendor Intelligence Database:', err.message);
}

/**
 * Service for resolving vendor information from MAC addresses and vendor database intelligence.
 */
export default {
  /**
   * Resolves a manufacturer name from a MAC address string.
   * @param {string} mac 
   * @returns {string|null}
   */
  resolveVendor(mac) {
    if (!mac) return null;
    const cleanPrefix = mac.toLowerCase().replace(/[:-]/g, '').substring(0, 6);
    const entry = ouiDatabase[cleanPrefix];
    return entry ? entry.vendor : null;
  },

  /**
   * Evaluates if a given vendor string matches a known camera manufacturer.
   * Distinguishes camera sub-brands (e.g. Tapo, VIGI) from general networking hardware (routers/switches).
   * @param {string} vendor 
   * @returns {boolean}
   */
  isCameraVendor(vendor) {
    if (!vendor) return false;
    const vLower = vendor.toLowerCase().trim();

    // Check against explicit camera brand aliases (e.g. "Tapo", "VIGI", "EZVIZ", "Imou")
    for (const [key, details] of Object.entries(cameraVendorsDatabase)) {
      if (details.aliases && details.aliases.some(alias => vLower.includes(alias.toLowerCase()))) {
        return true;
      }
      if (details.canonicalName && details.canonicalName.toLowerCase() === vLower) {
        return true;
      }
    }

    // Exclude general networking equipment vendors (routers, switches, APs)
    const generalNetworkingVendors = ['apple', 'intel', 'tp-link', 'tplink', 'netgear', 'asus', 'cisco', 'linksys', 'd-link', 'dlink', 'belkin', 'mikrotik'];
    if (generalNetworkingVendors.some(brand => vLower === brand || vLower.startsWith(brand + ' '))) {
      return false;
    }

    const defaultKeywords = ['hikvision', 'ezviz', 'axis', 'dahua', 'imou', 'lorex', 'uniview', 'hanwha', 'bosch', 'sony', 'panasonic', 'amcrest', 'reolink', 'foscam', 'wyze', 'tuya', 'xiongmai', 'xmeye', 'cp plus', 'vivotek', 'mobotix', 'tapo', 'vigi', 'eufy', 'blink', 'ring', 'wansview', 'annke', 'zosi', 'swann'];
    return defaultKeywords.some(k => vLower.includes(k));
  },

  /**
   * Retrieves vendor details from the intelligence database.
   * @param {string} vendor 
   * @returns {Object|null}
   */
  getVendorDetails(vendor) {
    if (!vendor) return null;
    const vLower = vendor.toLowerCase();
    for (const [key, details] of Object.entries(cameraVendorsDatabase)) {
      if (key.toLowerCase() === vLower || (details.canonicalName && details.canonicalName.toLowerCase() === vLower)) {
        return details;
      }
    }
    return null;
  }
};
