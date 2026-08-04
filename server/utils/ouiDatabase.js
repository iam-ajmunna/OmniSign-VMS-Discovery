/**
 * Comprehensive offline MAC OUI vendor lookup table for network cameras, NVRs,
 * IoT security devices, and standard network equipment.
 */

const OUI_MAP = new Map([
  // --- HIKVISION / EZVIZ ---
  ['bc1485', 'Hikvision'],
  ['002363', 'Hikvision'],
  ['105bfa', 'Hikvision / EZVIZ'],
  ['1868cb', 'Hikvision'],
  ['24acac', 'Hikvision'],
  ['2857be', 'Hikvision / EZVIZ'],
  ['346f24', 'Hikvision'],
  ['4447cc', 'Hikvision'],
  ['4419b6', 'Hikvision'],
  ['4c11bf', 'Hikvision'],
  ['541473', 'Hikvision'],
  ['5803fb', 'Hikvision'],
  ['608882', 'Hikvision'],
  ['70b3d5', 'Hikvision'],
  ['742e94', 'Hikvision'],
  ['80e650', 'Hikvision'],
  ['849a40', 'Hikvision'],
  ['8c1f64', 'Hikvision'],
  ['94e1ac', 'Hikvision'],
  ['a0bd1d', 'Hikvision'],
  ['a41437', 'Hikvision'],
  ['ac220b', 'Hikvision'],
  ['b8a386', 'Hikvision'],
  ['c42f90', 'Hikvision'],
  ['d4529d', 'Hikvision'],
  ['e49339', 'Hikvision'],
  ['f085c1', 'Hikvision'],
  ['f4a4ad', 'Hikvision'],

  // --- DAHUA / IMOU / LOREX / CP PLUS ---
  ['00023b', 'Dahua Technology'],
  ['001a07', 'Dahua Technology'],
  ['14a629', 'Dahua Technology / CP Plus'],
  ['3cef8c', 'Dahua Technology'],
  ['9002a9', 'Dahua / Amcrest'],
  ['b4a382', 'Dahua Technology'],
  ['bcc342', 'Dahua Technology'],
  ['d850e6', 'Dahua Technology'],
  ['e422a5', 'Dahua / Amcrest'],
  ['f4b85e', 'Dahua Technology'],
  ['f85b9c', 'Dahua Technology'],

  // --- AXIS COMMUNICATIONS ---
  ['00408c', 'Axis Communications'],
  ['accc8e', 'Axis Communications'],
  ['b8a44f', 'Axis Communications'],
  ['e82725', 'Axis Communications'],

  // --- HANWHA / SAMSUNG TECHWIN ---
  ['0000f0', 'Hanwha Techwin'],
  ['000918', 'Hanwha Techwin'],
  ['00166c', 'Hanwha Techwin'],
  ['0021d9', 'Hanwha Techwin'],
  ['0024e9', 'Hanwha Techwin'],
  ['0026e0', 'Hanwha Techwin'],
  ['701a04', 'Hanwha Techwin'],

  // --- UNIVVIEW (UNV) ---
  ['209b5c', 'Uniview'],
  ['6c8104', 'Uniview'],
  ['706979', 'Uniview'],
  ['7c2586', 'Uniview'],

  // --- BOSCH SECURITY ---
  ['00075f', 'Bosch Security'],
  ['001271', 'Bosch Security'],
  ['001e09', 'Bosch Security'],
  ['0021c3', 'Bosch Security'],

  // --- SONY ---
  ['00014a', 'Sony'],
  ['000b6b', 'Sony'],
  ['0013a9', 'Sony'],
  ['001d91', 'Sony'],
  ['0024be', 'Sony'],

  // --- PANASONIC ---
  ['008045', 'Panasonic'],
  ['000b97', 'Panasonic'],
  ['001150', 'Panasonic'],
  ['001844', 'Panasonic'],

  // --- FOSCAM ---
  ['00626e', 'Foscam'],
  ['c4d655', 'Foscam'],
  ['e06290', 'Foscam'],

  // --- REOLINK ---
  ['ec71db', 'Reolink'],
  ['a408ea', 'Reolink'],

  // --- WYZE ---
  ['2caa8e', 'Wyze Labs'],
  ['7c78b2', 'Wyze Labs'],
  ['a851ab', 'Wyze Labs'],
  ['d4351d', 'Wyze Labs'],

  // --- TUYA / SMART LIFE / GENERIC IOT CAMERAS ---
  ['1c90ff', 'Tuya Smart Camera'],
  ['2050e7', 'Tuya Smart Camera'],
  ['24dfa7', 'Tuya Smart Camera'],
  ['385b44', 'Tuya Smart Camera'],
  ['508a06', 'Tuya Smart Camera'],
  ['68572d', 'Tuya Smart Camera'],
  ['708976', 'Tuya Smart Camera'],
  ['7886b4', 'Tuya Smart Camera'],
  ['84e805', 'Tuya Smart Camera'],
  ['a4c138', 'Tuya Smart Camera'],
  ['cb8f60', 'Tuya Smart Camera'],
  ['d4a367', 'Tuya Smart Camera'],
  ['d81610', 'Tuya Smart Camera'],
  ['e04e97', 'Tuya Smart Camera'],
  ['e82a44', 'Tuya Smart Camera'],

  // --- XIONGMAI / XMEYE ---
  ['001217', 'Xiongmai (XMeye)'],
  ['001216', 'Xiongmai (XMeye)'],
  ['001218', 'Xiongmai (XMeye)'],

  // --- UBIQUITI UNIFI ---
  ['00156d', 'Ubiquiti UniFi'],
  ['0418d6', 'Ubiquiti UniFi'],
  ['18e829', 'Ubiquiti UniFi'],
  ['24a43c', 'Ubiquiti UniFi'],
  ['68d79a', 'Ubiquiti UniFi'],
  ['70a741', 'Ubiquiti UniFi'],
  ['7483c2', 'Ubiquiti UniFi'],
  ['788a20', 'Ubiquiti UniFi'],
  ['802aa8', 'Ubiquiti UniFi'],
  ['b4fbe4', 'Ubiquiti UniFi'],
  ['d8b206', 'Ubiquiti UniFi'],
  ['e063da', 'Ubiquiti UniFi'],
  ['f09fc2', 'Ubiquiti UniFi'],

  // --- TP-LINK (TAPO / KASA / ROUTERS) ---
  ['001478', 'TP-Link'],
  ['0019e0', 'TP-Link'],
  ['002129', 'TP-Link'],
  ['18d6c7', 'TP-Link'],
  ['30de4b', 'TP-Link'],
  ['50c7bf', 'TP-Link'],
  ['54af97', 'TP-Link'],
  ['6032b1', 'TP-Link'],
  ['704f57', 'TP-Link'],
  ['74da38', 'TP-Link'],
  ['98dab4', 'TP-Link'],
  ['a42bb0', 'TP-Link'],
  ['b09575', 'TP-Link'],
  ['c025e9', 'TP-Link'],
  ['c46e1f', 'TP-Link'],
  ['d807b6', 'TP-Link'],
  ['da7063', 'TP-Link'],
  ['da6d9f', 'TP-Link'],
  ['e848b8', 'TP-Link'],
  ['ec172f', 'TP-Link'],
  ['f4f26d', 'TP-Link'],

  // --- GENERAL CONSUMER EQUIPMENT ---
  ['ccbabd', 'Apple'],
  ['ccba8d', 'Apple'],
  ['be1138', 'Apple'],
  ['d6ae93', 'Apple'],
  ['c42360', 'Intel'],
  ['e4b97a', 'Intel'],
  ['e4a8df', 'Intel'],
  ['7a527a', 'Virtual MAC (Private)'],
  ['528ce6', 'Private MAC Address']
]);

const CAMERA_VENDOR_KEYWORDS = [
  'hikvision', 'ezviz', 'axis', 'dahua', 'imou', 'lorex', 'uniview', 'hanwha',
  'samsung', 'bosch', 'sony', 'panasonic', 'amcrest', 'reolink', 'foscam',
  'wyze', 'tuya', 'xiongmai', 'xmeye', 'cp plus', 'vivotek', 'mobotix',
  'ubiquiti', 'unifi', 'eufy', 'blink', 'ring', 'wansview', 'annke', 'zosi'
];

/**
 * Resolves MAC address prefix to vendor string.
 * @param {string} mac 
 * @returns {string|null}
 */
export function resolveVendor(mac) {
  if (!mac) return null;
  const prefix = mac.toLowerCase().replace(/[:-]/g, '').substring(0, 6);
  return OUI_MAP.get(prefix) || null;
}

/**
 * Checks whether a given vendor string represents a camera manufacturer.
 * @param {string} vendor 
 * @returns {boolean}
 */
export function isCameraVendor(vendor) {
  if (!vendor) return false;
  const v = vendor.toLowerCase();
  return CAMERA_VENDOR_KEYWORDS.some(keyword => v.includes(keyword));
}
