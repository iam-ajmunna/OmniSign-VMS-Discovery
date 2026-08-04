import http from 'http';

/**
 * ONVIF availability monitor.
 *
 * Strategy:
 *  Sends a minimal ONVIF GetSystemDateAndTime SOAP request — this endpoint
 *  requires no authentication, making it ideal for health probing.
 *  A valid SOAP response means ONVIF is active on the device.
 */

const ONVIF_TIMEOUT_MS = 4000;

const SOAP_PROBE = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope">
  <s:Body>
    <GetSystemDateAndTime xmlns="http://www.onvif.org/ver10/device/wsdl"/>
  </s:Body>
</s:Envelope>`;

/**
 * Probes ONVIF by sending an unauthenticated GetSystemDateAndTime request.
 * @param {string} ip
 * @param {number} [port=80]
 * @returns {Promise<{ available: boolean, authenticated: boolean, responseCode: number|null, latencyMs: number|null, error: string|null }>}
 */
function probe(ip, port = 80) {
  return new Promise((resolve) => {
    const start = Date.now();
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve({ ...result, latencyMs: Date.now() - start });
    };

    const options = {
      hostname: ip,
      port,
      path: '/onvif/device_service',
      method: 'POST',
      timeout: ONVIF_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Content-Length': Buffer.byteLength(SOAP_PROBE),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        const code = res.statusCode;
        // 200 = OK (may still need auth for streams), 401/400 = camera is alive but auth needed
        const available = code === 200 || code === 400 || code === 401 || code === 500;
        const authenticated = code === 200 && body.includes('GetSystemDateAndTimeResponse');
        finish({ available, authenticated, responseCode: code, error: null });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      finish({ available: false, authenticated: false, responseCode: null, error: 'Timeout' });
    });

    req.on('error', (err) => {
      finish({ available: false, authenticated: false, responseCode: null, error: err.message });
    });

    req.write(SOAP_PROBE);
    req.end();
  });
}

/**
 * Probes ONVIF on common ports (80, 8080, 8000).
 * @param {string} ip
 * @param {number[]} [ports=[80, 8080, 8000]]
 */
async function probeAny(ip, ports = [80, 8080, 8000]) {
  for (const port of ports) {
    const result = await probe(ip, port);
    if (result.available) {
      return { ...result, port };
    }
  }
  return { available: false, authenticated: false, responseCode: null, port: null, latencyMs: null, error: 'ONVIF not reachable' };
}

export default { probe, probeAny };
