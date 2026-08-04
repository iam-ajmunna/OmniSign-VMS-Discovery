import net from 'net';
import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import { Settings } from '../config/index.js';

export default {
  name: 'Ping',
  protocol: 'ICMP/TCP',
  description: 'Sweeps subnet IPs and checks open camera ports to locate active network nodes.',
  enabled: true,

  /**
   * Performs an asynchronous, rate-limited TCP sweep over the local /24 subnet.
   * Checks ports 80 (HTTP/ONVIF) and 554 (RTSP stream).
   * 
   * @param {string} localIp - Host IP
   * @param {AbortSignal} abortSignal - Cancellation token
   * @returns {Promise<Object[]>} Resolved list of active camera nodes
   */
  async execute(localIp, abortSignal) {
    logger.info('[Ping Scanner] Initiating live subnet sweeps...');
    eventBus.emit(Events.SCANNER_STARTED, { name: 'Ping', protocol: 'ICMP/TCP' });

    // Derive the C-Class /24 subnet range
    const ipParts = localIp.split('.');
    if (ipParts.length !== 4) {
      logger.error(`[Ping Scanner] Invalid local IP format: ${localIp}`);
      eventBus.emit(Events.SCANNER_ERROR, { name: 'Ping', error: 'Invalid IP' });
      return [];
    }

    const subnetPrefix = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
    
    // Generate list of targets (1 to 254, excluding local host)
    const targets = [];
    for (let i = 1; i <= 254; i++) {
      const ip = `${subnetPrefix}.${i}`;
      if (ip !== localIp) {
        targets.push(ip);
      }
    }

    const discovered = [];
    const portsToCheck = [554, 80, 8000, 3702]; // Core video & web ports
    
    // Limits socket concurrency to avoid OS file descriptor leakage
    const concurrency = 50; 
    const timeout = 300; // 300ms socket timeout for fast responsive sweeps

    logger.info(`$ sweep-net --subnet ${subnetPrefix}.0/24 --ports 554,80,8000,3702 --concurrency ${concurrency}`);

    // Batch processor
    for (let i = 0; i < targets.length; i += concurrency) {
      if (abortSignal.aborted) {
        logger.warn('[Ping Scanner] Scan aborted by user.');
        eventBus.emit(Events.SCANNER_ERROR, { name: 'Ping', error: 'Cancelled' });
        return discovered;
      }

      const batch = targets.slice(i, i + concurrency);
      
      // Run batch promises in parallel
      await Promise.all(batch.map(async (ip) => {
        for (const port of portsToCheck) {
          if (abortSignal.aborted) return;

          const open = await checkPort(ip, port, timeout);
          if (open) {
            // Found a responsive IP exposing camera-specific ports
            logger.info(`  [TCP Open] ${ip}:${port} resolved service.`);
            
            const existing = discovered.find(d => d.ip === ip);
            if (existing) {
              existing.openPorts.push({ port, service: port === 554 ? 'RTSP' : 'HTTP' });
            } else {
              const node = {
                ip,
                mac: null,
                openPorts: [{ port, service: port === 554 ? 'RTSP' : 'HTTP' }],
                discoveryMethods: ['Ping'],
                rawPayloads: {}
              };
              discovered.push(node);
              // Broadcast discovery
              eventBus.emit(Events.DEVICE_FOUND, node);
            }
          }
        }
      }));

      // Report progress to UI
      const percent = Math.round(((i + batch.length) / targets.length) * 100);
      eventBus.emit(Events.SCANNER_PROGRESS, {
        name: 'Ping',
        progress: percent,
        message: `Scanning range... ${percent}%`
      });
    }

    logger.info(`[Ping Scanner] Completed subnet sweep. Found ${discovered.length} active nodes.`);
    eventBus.emit(Events.SCANNER_FINISHED, { name: 'Ping', discoveredCount: discovered.length });
    return discovered;
  }
};

/**
 * Native Node.js TCP socket check helper.
 * @param {string} host 
 * @param {number} port 
 * @param {number} timeout 
 * @returns {Promise<boolean>}
 */
function checkPort(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isDone = false;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      isDone = true;
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      if (!isDone) {
        isDone = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.on('error', () => {
      if (!isDone) {
        isDone = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}
