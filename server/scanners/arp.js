import { execFile } from 'child_process';
import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';

export default {
  name: 'ARP',
  protocol: 'ARP',
  description: 'Reads physical IP-to-MAC address maps from the local host OS ARP cache.',
  enabled: true,
  
  /**
   * Executes real system ARP dumps and parses stdout.
   * @param {string} localIp - Host IP address
   * @param {AbortSignal} abortSignal - Cancellation token
   * @returns {Promise<Object[]>} Resolved list of raw devices
   */
  async execute(localIp, abortSignal) {
    logger.info('[ARP Scanner] Launching command execution...');
    eventBus.emit(Events.SCANNER_STARTED, { name: 'ARP', protocol: 'ARP' });

    const isWin = process.platform === 'win32';
    const cmd = 'arp';
    const args = isWin ? ['-a'] : ['-an'];

    // Format console output prompt
    logger.info(`${isWin ? '> ' : '$ '}${cmd} ${args.join(' ')}`);

    return new Promise((resolve) => {
      // Execute command with abort signal integrated
      const child = execFile(cmd, args, { signal: abortSignal }, (error, stdout, stderr) => {
        if (error) {
          if (error.name === 'AbortError' || abortSignal.aborted) {
            logger.warn('[ARP Scanner] Process aborted by user.');
            eventBus.emit(Events.SCANNER_ERROR, { name: 'ARP', error: 'Cancelled' });
            return resolve([]);
          }
          logger.error(`[ARP Scanner] Execution failed: ${error.message}`);
          eventBus.emit(Events.SCANNER_ERROR, { name: 'ARP', error: error.message });
          return resolve([]);
        }

        const lines = stdout.split('\n');
        const discovered = [];

        // Parsing lines
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Write command stdout line by line to logger
          logger.debug(`  ${trimmed}`);

          let ip = null;
          let mac = null;

          if (isWin) {
            // Windows format: 192.168.1.1      00-11-22-33-44-55     dynamic
            const winRegex = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+([0-9a-fA-F-]{17})/;
            const match = winRegex.exec(trimmed);
            if (match) {
              ip = match[1];
              mac = match[2].replace(/-/g, ':').toLowerCase();
            }
          } else {
            // Unix format: ? (192.168.1.1) at 0:11:22:33:44:55 ...
            const unixRegex = /(?:(?:\((\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\))|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))\s+(?:at\s+)?([0-9a-fA-F]{1,2}(?::[0-9a-fA-F]{1,2}){5})/;
            const match = unixRegex.exec(trimmed);
            if (match) {
              ip = match[1] || match[2];
              // Pad single digit hex octets (e.g. 0:11:22... -> 00:11:22...)
              mac = match[3].split(':').map(octet => octet.padStart(2, '0')).join(':').toLowerCase();
            }
          }

          // Ignore gateway falls, multicast IPs, and broadcast masks
          if (ip && mac && ip !== '255.255.255.255' && !ip.startsWith('224.') && !ip.startsWith('239.')) {
            const cleanMac = mac.toLowerCase();
            
            // Avoid adding multicast group MACs (starts with 01:00:5e)
            if (cleanMac.startsWith('01:00:5e') || cleanMac === 'ff:ff:ff:ff:ff:ff') {
              continue;
            }

            discovered.push({
              ip,
              mac: cleanMac,
              discoveryMethods: ['ARP'],
              rawPayloads: {}
            });
          }
        }

        logger.info(`[ARP Scanner] Finished parsing. Found ${discovered.length} entries in host cache.`);
        
        // Broadcast all found devices
        discovered.forEach(dev => eventBus.emit(Events.DEVICE_FOUND, dev));
        eventBus.emit(Events.SCANNER_FINISHED, { name: 'ARP', discoveredCount: discovered.length });
        
        resolve(discovered);
      });
    });
  }
};
