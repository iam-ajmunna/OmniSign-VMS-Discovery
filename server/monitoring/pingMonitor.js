import net from 'net';

/**
 * TCP-based reachability and latency probe.
 * Uses a raw TCP connect to avoid requiring root/ICMP privileges.
 * Probes the camera's most likely open ports in priority order.
 */

const PROBE_PORTS = [554, 80, 8080, 443, 8000];
const CONNECT_TIMEOUT_MS = 2500;

/**
 * Attempts a TCP connect to determine reachability and measures RTT.
 * @param {string} ip
 * @param {number} port
 * @param {number} [timeoutMs]
 * @returns {Promise<{ reachable: boolean, latencyMs: number|null }>}
 */
function probeTcp(ip, port, timeoutMs = CONNECT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;

    const finish = (reachable) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({
        reachable,
        latencyMs: reachable ? Date.now() - start : null
      });
    };

    socket.setTimeout(timeoutMs);
    socket.connect(port, ip, () => finish(true));
    socket.on('timeout', () => finish(false));
    socket.on('error', () => finish(false));
  });
}

/**
 * Probes multiple ports and returns the first successful result.
 * Falls back to 'unreachable' if all ports fail.
 * @param {string} ip
 * @param {number[]} [ports]
 * @returns {Promise<{ reachable: boolean, latencyMs: number|null, probePort: number|null }>}
 */
async function probe(ip, ports = PROBE_PORTS) {
  for (const port of ports) {
    const result = await probeTcp(ip, port);
    if (result.reachable) {
      return { ...result, probePort: port };
    }
  }
  return { reachable: false, latencyMs: null, probePort: null };
}

export default { probe, probeTcp, PROBE_PORTS };
