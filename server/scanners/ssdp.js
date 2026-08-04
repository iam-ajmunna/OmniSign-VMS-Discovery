import dgram from 'dgram';
import http from 'http';
import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import { Settings } from '../config/index.js';

export default {
  name: 'SSDP',
  protocol: 'UPnP',
  description: 'Broadcasts SSDP search probes to discover UPnP-compliant cameras.',
  enabled: true,

  /**
   * Performs a live SSDP M-SEARCH broadcast over UDP port 1900.
   * Resolves UPnP responsive network hardware and fetches XML descriptors.
   * 
   * @param {string} localIp - Host interface IP
   * @param {AbortSignal} abortSignal - Cancellation token
   * @returns {Promise<Object[]>} Resolved list of discovered UPnP devices
   */
  async execute(localIp, abortSignal) {
    logger.info('[SSDP Scanner] Initiating live SSDP query...');
    eventBus.emit(Events.SCANNER_STARTED, { name: 'SSDP', protocol: 'UPnP' });

    const discovered = [];
    const SSDP_PORT = 1900;
    const SSDP_MULTICAST = '239.255.255.250';

    const query = 
      'M-SEARCH * HTTP/1.1\r\n' +
      `HOST: ${SSDP_MULTICAST}:${SSDP_PORT}\r\n` +
      'MAN: "ssdp:discover"\r\n' +
      'MX: 2\r\n' +
      'ST: ssdp:all\r\n' +
      '\r\n';

    logger.info(`$ udp-send --address ${localIp} --target ${SSDP_MULTICAST}:${SSDP_PORT} --data "M-SEARCH ST:ssdp:all"`);

    return new Promise((resolve) => {
      let socket = null;
      let completed = false;

      const cleanup = () => {
        if (completed) return;
        completed = true;
        
        if (socket) {
          try {
            socket.close();
          } catch (e) {
            // Ignore socket closure errors
          }
          socket = null;
        }
        
        abortSignal.removeEventListener('abort', handleAbort);
      };

      const handleAbort = () => {
        logger.warn('[SSDP Scanner] Execution halted by cancellation signal.');
        cleanup();
        eventBus.emit(Events.SCANNER_ERROR, { name: 'SSDP', error: 'Cancelled' });
        resolve(discovered);
      };

      abortSignal.addEventListener('abort', handleAbort);

      try {
        socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
        
        socket.on('error', (err) => {
          logger.error(`[SSDP Scanner] Socket error: ${err.message}`);
          eventBus.emit(Events.SCANNER_ERROR, { name: 'SSDP', error: err.message });
          cleanup();
          resolve(discovered);
        });

        socket.on('message', (msg, rinfo) => {
          const rawResponse = msg.toString();
          const headers = parseHeaders(rawResponse);
          
          logger.info(`  << Received SSDP response from ${rinfo.address}:${rinfo.port}`);
          
          const responseLines = rawResponse.split('\r\n').slice(0, 3);
          responseLines.forEach(l => {
            if (l.trim()) logger.info(`  << ${l}`);
          });

          if (discovered.some(d => d.ip === rinfo.address)) {
            return;
          }

          const payloadStr = (rawResponse + ' ' + (headers['LOCATION'] || '') + ' ' + (headers['SERVER'] || '') + ' ' + (headers['ST'] || '')).toLowerCase();
          const cameraKeywords = ['camera', 'ipc', 'netcam', 'onvif', 'rtsp', 'nvr', 'dvr', 'hikvision', 'axis', 'dahua', 'tapo', 'foscam', 'reolink', 'wyze', 'tuya', 'ezviz', 'amcrest'];
          const isCam = cameraKeywords.some(k => payloadStr.includes(k));

          const node = {
            ip: rinfo.address,
            mac: null,
            hostname: headers['SERVER'] || headers['USN'] || null,
            isCamera: isCam,
            discoveryMethods: ['SSDP'],
            rawPayloads: {
              ssdpHeaders: headers
            }
          };

          discovered.push(node);
          eventBus.emit(Events.DEVICE_FOUND, node);

          // Asynchronously fetch UPnP XML device descriptor to resolve manufacturer & model name!
          if (headers['LOCATION']) {
            fetchDeviceDescription(headers['LOCATION']).then(desc => {
              if (desc) {
                if (desc.vendor) node.vendor = desc.vendor;
                if (desc.model) node.model = desc.model;
                if (desc.hostname) node.hostname = desc.hostname;

                const descText = ((desc.vendor || '') + ' ' + (desc.model || '') + ' ' + (desc.hostname || '')).toLowerCase();
                if (cameraKeywords.some(k => descText.includes(k))) {
                  node.isCamera = true;
                }
                logger.info(`  [UPnP Description] ${rinfo.address}: Vendor=${desc.vendor || 'N/A'}, Model=${desc.model || 'N/A'}`);
                eventBus.emit(Events.DEVICE_FOUND, node);
              }
            });
          }
        });

        socket.bind({ address: localIp, port: 0 }, () => {
          try {
            socket.setMulticastTTL(4);
            const buffer = Buffer.from(query);
            
            socket.send(buffer, 0, buffer.length, SSDP_PORT, SSDP_MULTICAST, (err) => {
              if (err) {
                logger.error(`[SSDP Scanner] UDP Send failed: ${err.message}`);
                cleanup();
                resolve(discovered);
              }
            });
          } catch (bindErr) {
            logger.error(`[SSDP Scanner] Socket configuration failed: ${bindErr.message}`);
            cleanup();
            resolve(discovered);
          }
        });

        const timeoutMs = Settings.ssdpTimeoutMs || 3000;
        
        const progressInterval = setInterval(() => {
          if (completed) {
            clearInterval(progressInterval);
            return;
          }
          eventBus.emit(Events.SCANNER_PROGRESS, { name: 'SSDP', progress: 50, message: 'Listening for UPnP responses...' });
        }, 1000);

        setTimeout(() => {
          clearInterval(progressInterval);
          if (completed) return;
          logger.info(`[SSDP Scanner] Listening window closed. Found ${discovered.length} nodes.`);
          eventBus.emit(Events.SCANNER_FINISHED, { name: 'SSDP', discoveredCount: discovered.length });
          cleanup();
          resolve(discovered);
        }, timeoutMs);

      } catch (err) {
        logger.error(`[SSDP Scanner] Initialization crashed: ${err.message}`);
        cleanup();
        resolve(discovered);
      }
    });
  }
};

/**
 * Parses raw HTTP response-style headers into key-value map.
 * @param {string} msg 
 * @returns {Record<string, string>}
 */
function parseHeaders(msg) {
  const headers = {};
  const lines = msg.split('\r\n');
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx !== -1) {
      const key = line.substring(0, idx).trim().toUpperCase();
      const val = line.substring(idx + 1).trim();
      headers[key] = val;
    }
  }
  return headers;
}

/**
 * Fetches UPnP XML device descriptor from LOCATION URL.
 * Parses <manufacturer>, <modelName>, and <friendlyName>.
 * @param {string} locationUrl 
 * @returns {Promise<Object|null>}
 */
function fetchDeviceDescription(locationUrl) {
  return new Promise((resolve) => {
    if (!locationUrl || !locationUrl.startsWith('http')) return resolve(null);
    
    try {
      const req = http.get(locationUrl, { timeout: 1500 }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          const mfgMatch = /<manufacturer[^>]*>([^<]+)<\/manufacturer>/i.exec(body);
          const modelMatch = /<modelName[^>]*>([^<]+)<\/modelName>/i.exec(body);
          const nameMatch = /<friendlyName[^>]*>([^<]+)<\/friendlyName>/i.exec(body);

          resolve({
            vendor: mfgMatch ? mfgMatch[1].trim() : null,
            model: modelMatch ? modelMatch[1].trim() : null,
            hostname: nameMatch ? nameMatch[1].trim() : null,
            rawXml: body
          });
        });
      });

      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    } catch (e) {
      resolve(null);
    }
  });
}
