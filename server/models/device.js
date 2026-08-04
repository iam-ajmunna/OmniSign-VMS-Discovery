/**
 * JSDoc definitions for the Canonical Device Model.
 * Represents a single unified, deduplicated network camera node.
 * 
 * @typedef {Object} OpenPort
 * @property {number} port - Port number
 * @property {string} service - Identifiable camera service name (e.g. "RTSP (Stream Access)")
 * 
 * @typedef {Object} DiscoveredDevice
 * @property {string} id - Deterministic unique identifier (typically MD5 hash of MAC or IP)
 * @property {string} ip - IPv4 network address
 * @property {string|null} mac - Normalized MAC address (format: XX:XX:XX:XX:XX:XX) or null
 * @property {string|null} hostname - Network hostname if resolved
 * @property {string|null} vendor - Resolved manufacturer name (e.g. "Hikvision")
 * @property {string|null} model - Resolved model description
 * @property {string[]} discoveryMethods - Array of methods finding this node (e.g. ["ARP", "ONVIF"])
 * @property {OpenPort[]} openPorts - Array of verified target camera ports
 * @property {number} confidence - Scoring value showing match certainty (0 - 100)
 * @property {string} firstSeen - ISO 8601 string when node was first discovered
 * @property {string} lastSeen - ISO 8601 string of last updated property
 * @property {Object} rawPayloads - Original raw output responses parsed from packets
 * @property {string[]} [rawPayloads.onvifScopes]
 * @property {Record<string, string>} [rawPayloads.ssdpHeaders]
 * @property {Record<string, string>} [rawPayloads.mdnsTxt]
 */

export const DeviceModelSchema = {
  id: '',
  ip: '',
  mac: null,
  hostname: null,
  vendor: null,
  model: null,
  discoveryMethods: [],
  openPorts: [],
  confidence: 0,
  firstSeen: '',
  lastSeen: '',
  rawPayloads: {}
};
