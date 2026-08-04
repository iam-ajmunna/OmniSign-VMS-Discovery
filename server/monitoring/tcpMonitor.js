import net from 'net';

/**
 * Multi-port TCP availability scanner.
 * Returns a boolean map of {port: open} for a defined set of camera ports.
 */

const CAMERA_PORTS = [80, 443, 554, 8000, 8080, 8554, 3702];
const SCAN_TIMEOUT_MS = 2000;
const MAX_CONCURRENT = 4;

/**
 * Raw TCP connect probe — standalone, no dependency on pingMonitor.
 * @param {string} ip
 * @param {number} port
 * @param {number} timeoutMs
 * @returns {Promise<boolean>}
 */
function isPortOpen(ip, port, timeoutMs = SCAN_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (open) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(open);
    };

    socket.setTimeout(timeoutMs);
    socket.connect(port, ip, () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  });
}

/**
 * Probes all target camera ports concurrently (with concurrency cap).
 * @param {string} ip
 * @param {number[]} [ports]
 * @returns {Promise<Record<number, boolean>>}
 */
async function scanPorts(ip, ports = CAMERA_PORTS) {
  const results = {};
  const queue = [...ports];

  const worker = async () => {
    while (queue.length > 0) {
      const port = queue.shift();
      if (port === undefined) break;
      results[port] = await isPortOpen(ip, port);
    }
  };

  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT, ports.length) }, worker));
  return results;
}

export default { scanPorts, isPortOpen, CAMERA_PORTS };
