/**
 * Input sanitization and validation utilities for network commands and IP parameters.
 */
export default {
  /**
   * Validates if a string is a clean, unmanipulated IPv4 address.
   * @param {string} ip 
   * @returns {boolean}
   */
  isValidIPv4(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    return parts.every(part => {
      const num = parseInt(part, 10);
      return !isNaN(num) && num >= 0 && num <= 255 && part === num.toString();
    });
  },

  /**
   * Cleans MAC address formatting into standard colon-separated lower case.
   * @param {string} mac 
   * @returns {string|null}
   */
  normalizeMac(mac) {
    if (!mac || typeof mac !== 'string') return null;
    const clean = mac.replace(/[:-]/g, '').toLowerCase();
    if (clean.length !== 12 || !/^[0-9a-f]{12}$/.test(clean)) return null;
    return clean.match(/.{1,2}/g).join(':');
  }
};
