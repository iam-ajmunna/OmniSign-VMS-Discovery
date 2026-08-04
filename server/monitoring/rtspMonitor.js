import net from 'net';

/**
 * RTSP stream monitor.
 *
 * Strategy:
 *  1. TCP connect to RTSP port (554 or configured) — confirms port open
 *  2. Send a minimal RTSP OPTIONS request — confirms RTSP service is alive
 *  3. Parse response code — 200 = healthy, 401 = auth required (still alive),
 *     other = degraded, timeout = unreachable
 *
 * This approach requires no ffmpeg and works with every RTSP camera.
 */

const RTSP_TIMEOUT_MS = 3000;

/**
 * Sends a raw RTSP OPTIONS request and parses the response code.
 * @param {string} ip
 * @param {number} [port=554]
 * @returns {Promise<{ connected: boolean, responseCode: number|null, latencyMs: number|null, error: string|null }>}
 */
function probe(ip, port = 554) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let settled = false;
    let responseBuffer = '';

    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve({ ...result, latencyMs: Date.now() - start });
    };

    socket.setTimeout(RTSP_TIMEOUT_MS);

    socket.connect(port, ip, () => {
      // TCP connected — send a minimal RTSP OPTIONS probe
      socket.write(
        `OPTIONS rtsp://${ip}:${port}/ RTSP/1.0\r\n` +
        `CSeq: 1\r\n` +
        `User-Agent: OmniSight-HealthProbe/2.0\r\n\r\n`
      );
    });

    socket.on('data', (data) => {
      responseBuffer += data.toString();
      // Parse first line: "RTSP/1.0 200 OK"
      const match = responseBuffer.match(/^RTSP\/[\d.]+ (\d{3})/);
      if (match) {
        const code = parseInt(match[1], 10);
        // 200 = OK, 401 = Unauthorized (auth required but camera is alive)
        const connected = code === 200 || code === 401;
        finish({ connected, responseCode: code, error: null });
      }
    });

    socket.on('timeout', () => {
      finish({ connected: false, responseCode: null, error: 'Timeout' });
    });

    socket.on('error', (err) => {
      finish({ connected: false, responseCode: null, error: err.message });
    });

    socket.on('close', () => {
      // Socket closed before we got a full response (e.g. non-RTSP service on port)
      if (!settled) {
        finish({ connected: false, responseCode: null, error: 'Connection closed' });
      }
    });
  });
}

/**
 * Probes RTSP on the first available RTSP port from a list.
 * @param {string} ip
 * @param {number[]} [rtspPorts=[554, 8554]]
 * @returns {Promise<{ connected: boolean, responseCode: number|null, port: number|null, latencyMs: number|null, error: string|null }>}
 */
async function probeAny(ip, rtspPorts = [554, 8554]) {
  for (const port of rtspPorts) {
    const result = await probe(ip, port);
    if (result.connected) {
      return { ...result, port };
    }
  }
  // Return the last failed result with port info
  return { connected: false, responseCode: null, port: null, latencyMs: null, error: 'No RTSP port reachable' };
}

export default { probe, probeAny };
