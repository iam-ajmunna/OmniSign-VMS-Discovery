import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const vendorsPath = path.join(__dirname, '../database/camera_vendors.json');

let cameraVendors = {};
try {
  cameraVendors = JSON.parse(fs.readFileSync(vendorsPath, 'utf8'));
} catch (e) {
  // Fallback
}

const GENERIC_TEMPLATES = [
  { label: 'ONVIF / Generic RTSP', path: '/live/main' },
  { label: 'ONVIF Sub Stream', path: '/live/sub' }
];

export default {
  /**
   * Generates formatted RTSP stream URLs for a camera device using database templates.
   * @param {string} ip - Camera IP address
   * @param {string} [vendor] - Manufacturer vendor name
   * @param {number} [port=554] - RTSP port
   * @param {string} [username='admin'] - Auth username
   * @param {string} [password='password'] - Auth password
   * @returns {Array<{ label: string, url: string, path: string }>}
   */
  generateRtspUrls(ip, vendor = '', port = 554, username = 'admin', password = 'password') {
    if (!ip) return [];

    const vendorKey = (vendor || '').toLowerCase();
    let templates = GENERIC_TEMPLATES;

    for (const [key, details] of Object.entries(cameraVendors)) {
      const matchKey = key.toLowerCase();
      const matchName = (details.canonicalName || '').toLowerCase();
      if (vendorKey.includes(matchKey) || vendorKey.includes(matchName)) {
        if (details.rtspTemplates && details.rtspTemplates.length > 0) {
          templates = details.rtspTemplates;
          break;
        }
      }
    }

    const portSuffix = port === 554 ? '' : `:${port}`;

    return templates.map(t => {
      const authStr = username ? `${username}:${password}@` : '';
      return {
        label: t.label,
        path: t.path,
        url: `rtsp://${authStr}${ip}${portSuffix}${t.path}`
      };
    });
  }
};
