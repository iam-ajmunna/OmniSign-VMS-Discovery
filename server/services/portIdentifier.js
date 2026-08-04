/**
 * Service for mapping raw open TCP/UDP port numbers to descriptive video & camera service definitions.
 */

const PORT_MAP = new Map([
  [554, { service: 'RTSP', name: 'RTSP Streaming Protocol', cameraSpecific: true }],
  [8554, { service: 'RTSP Alt', name: 'RTSP Secondary Stream', cameraSpecific: true }],
  [10554, { service: 'RTSP Custom', name: 'RTSP Custom Stream', cameraSpecific: true }],
  [80, { service: 'HTTP', name: 'HTTP Web Management Console', cameraSpecific: false }],
  [8080, { service: 'HTTP Alt', name: 'HTTP Alternative Web Console', cameraSpecific: false }],
  [8000, { service: 'SDK/Web', name: 'Hikvision / Control SDK Protocol', cameraSpecific: true }],
  [3702, { service: 'ONVIF', name: 'ONVIF WS-Discovery', cameraSpecific: true }],
  [34567, { service: 'DVR Net', name: 'Xiongmai / XMeye DVR Protocol', cameraSpecific: true }],
  [8899, { service: 'ONVIF Alt', name: 'ONVIF Alternative Port', cameraSpecific: true }],
  [7447, { service: 'UniFi RTSP', name: 'Ubiquiti UniFi Protect RTSP', cameraSpecific: true }]
]);

export default {
  /**
   * Resolves service metadata for a given port number.
   * @param {number} port 
   * @returns {{ service: string, name: string, cameraSpecific: boolean }}
   */
  identifyPort(port) {
    return PORT_MAP.get(port) || {
      service: `TCP/${port}`,
      name: `Unknown Service (${port})`,
      cameraSpecific: false
    };
  },

  /**
   * Evaluates if any port in the list is camera-specific.
   * @param {Array<{port: number}>} openPorts 
   * @returns {boolean}
   */
  hasCameraPorts(openPorts) {
    if (!openPorts || !Array.isArray(openPorts)) return false;
    return openPorts.some(p => {
      const def = PORT_MAP.get(p.port);
      return def && def.cameraSpecific;
    });
  }
};
