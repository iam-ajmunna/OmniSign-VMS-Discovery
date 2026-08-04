/**
   * Configures camera protocol targets, ports, and multicast sockets.
   */
export const Protocols = Object.freeze({
  ONVIF: {
    multicastAddress: '239.255.255.250',
    port: 3702,
    timeout: 3000
  },
  SSDP: {
    multicastAddress: '239.255.255.250',
    port: 1900,
    timeout: 3000
  },
  MDNS: {
    multicastAddress: '224.0.0.251',
    port: 5353,
    timeout: 3000
  },
  PORTS: {
    // Ports scanned during TCP connect sweeps to determine reachability and camera identity
    cameraPorts: [
      { port: 80, service: 'HTTP (Web Panel)' },
      { port: 443, service: 'HTTPS (Web Panel Secured)' },
      { port: 554, service: 'RTSP (Stream Access)' },
      { port: 8000, service: 'Hikvision Service Port' },
      { port: 8080, service: 'Alternative HTTP Web Port' },
      { port: 8554, service: 'Alternative RTSP Stream Port' }
    ]
  }
});
