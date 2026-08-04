import dgram from 'dgram';
import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import { Settings } from '../config/index.js';

export default {
  name: 'mDNS',
  protocol: 'Bonjour/ZeroConf',
  description: 'Queries multicast DNS records to resolve RTSP and HTTP local camera services.',
  enabled: true,

  /**
   * Performs live mDNS service discovery on UDP 5353.
   * Broadcasts PTR queries for RTSP services (_rtsp._tcp.local).
   * 
   * @param {string} localIp - Host IP
   * @param {AbortSignal} abortSignal - Cancellation token
   * @returns {Promise<Object[]>} Resolved list of mDNS responsive nodes
   */
  async execute(localIp, abortSignal) {
    logger.info('[mDNS Scanner] Initiating live mDNS browse...');
    eventBus.emit(Events.SCANNER_STARTED, { name: 'mDNS', protocol: 'Bonjour/ZeroConf' });

    const discovered = [];
    const MDNS_PORT = 5353;
    const MDNS_MULTICAST = '224.0.0.251';

    // Construct raw DNS PTR query for "_rtsp._tcp.local"
    const transactionId = Buffer.from([0x00, 0x00]);
    const flags = Buffer.from([0x00, 0x00]); // Standard query
    const questions = Buffer.from([0x00, 0x01]);
    const answerRRs = Buffer.from([0x00, 0x00]);
    const authorityRRs = Buffer.from([0x00, 0x00]);
    const additionalRRs = Buffer.from([0x00, 0x00]);

    // Name parts: 5 _rtsp 4 _tcp 5 local 0
    const qname = Buffer.concat([
      Buffer.from([5]), Buffer.from('_rtsp'),
      Buffer.from([4]), Buffer.from('_tcp'),
      Buffer.from([5]), Buffer.from('local'),
      Buffer.from([0])
    ]);
    const qtype = Buffer.from([0x00, 0x0c]); // PTR record
    const qclass = Buffer.from([0x80, 0x01]); // IN class + QU bit for unicast response to ephemeral socket

    const queryPacket = Buffer.concat([
      transactionId, flags, questions, answerRRs, authorityRRs, additionalRRs,
      qname, qtype, qclass
    ]);

    logger.info(`$ dns-sd -B _rtsp._tcp local`);

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
        logger.warn('[mDNS Scanner] Execution halted by cancellation signal.');
        cleanup();
        eventBus.emit(Events.SCANNER_ERROR, { name: 'mDNS', error: 'Cancelled' });
        resolve(discovered);
      };

      abortSignal.addEventListener('abort', handleAbort);

      try {
        // Bind to port 0 (random ephemeral port) to send multicast queries and catch unicast replies
        // This avoids conflicts with system DNS responders (Avahi, mdnsd) binding to port 5353
        socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.on('error', (err) => {
          logger.error(`[mDNS Scanner] Socket error: ${err.message}`);
          eventBus.emit(Events.SCANNER_ERROR, { name: 'mDNS', error: err.message });
          cleanup();
          resolve(discovered);
        });

        socket.on('message', (msg, rinfo) => {
          if (rinfo.address === localIp) return; // Skip loops

          // Look for RTSP string flags in binary payload to verify response category
          const payloadStr = msg.toString('binary');
          if (!payloadStr.includes('_rtsp')) return;

          logger.info(`  << Resolved mDNS responder: ${rinfo.address}:${rinfo.port}`);

          // Extract basic ascii string labels as hostname candidates
          const asciiStrings = msg.toString('ascii').replace(/[^a-zA-Z0-9-_.]/g, ' ');
          const hostnameCandidate = extractHostname(asciiStrings) || `${rinfo.address}.local`;

          logger.info(`  << Service PTR: ${hostnameCandidate} -> ${rinfo.address}`);

          if (discovered.some(d => d.ip === rinfo.address)) {
            return;
          }

          const node = {
            ip: rinfo.address,
            mac: null,
            hostname: hostnameCandidate,
            discoveryMethods: ['mDNS'],
            rawPayloads: {
              mdnsPacketLength: msg.length
            }
          };

          discovered.push(node);
          eventBus.emit(Events.DEVICE_FOUND, node);
        });

        socket.bind({ address: localIp, port: 0 }, () => {
          try {
            socket.setMulticastTTL(255);
            
            // Send standard mDNS query packet
            socket.send(queryPacket, 0, queryPacket.length, MDNS_PORT, MDNS_MULTICAST, (err) => {
              if (err) {
                logger.error(`[mDNS Scanner] UDP Send failed: ${err.message}`);
                cleanup();
                resolve(discovered);
              }
            });
          } catch (bindErr) {
            logger.error(`[mDNS Scanner] Socket configuration failed: ${bindErr.message}`);
            cleanup();
            resolve(discovered);
          }
        });

        // Collect responses for a configurable timeout
        const timeoutMs = Settings.mdnsTimeoutMs || 3000;
        
        const progressInterval = setInterval(() => {
          if (completed) {
            clearInterval(progressInterval);
            return;
          }
          eventBus.emit(Events.SCANNER_PROGRESS, { name: 'mDNS', progress: 50, message: 'Resolving ZeroConf records...' });
        }, 1000);

        setTimeout(() => {
          clearInterval(progressInterval);
          if (completed) return;
          logger.info(`[mDNS Scanner] Browsing finished. Found ${discovered.length} nodes.`);
          eventBus.emit(Events.SCANNER_FINISHED, { name: 'mDNS', discoveredCount: discovered.length });
          cleanup();
          resolve(discovered);
        }, timeoutMs);

      } catch (err) {
        logger.error(`[mDNS Scanner] Initialization crashed: ${err.message}`);
        cleanup();
        resolve(discovered);
      }
    });
  }
};

/**
 * Basic heuristics to extract clean hostname flags from parsed ascii buffer strings.
 * @param {string} rawString 
 * @returns {string|null}
 */
function extractHostname(rawString) {
  const parts = rawString.split(/\s+/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.endsWith('.local') && trimmed.length > 6) {
      return trimmed;
    }
  }
  return null;
}
