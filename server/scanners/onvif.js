import dgram from 'dgram';
import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';
import { Settings } from '../config/index.js';

export default {
  name: 'ONVIF',
  protocol: 'WS-Discovery',
  description: 'Broadcasts ONVIF WS-Discovery SOAP envelopes to resolve device descriptors and XAddrs.',
  enabled: true,

  /**
   * Performs live ONVIF WS-Discovery SOAP probe multicast on port 3702.
   * Resolves ONVIF-compliant video transmitters (IP cameras).
   * 
   * @param {string} localIp - Host IP
   * @param {AbortSignal} abortSignal - Cancellation token
   * @returns {Promise<Object[]>} Resolved list of ONVIF responsive devices
   */
  async execute(localIp, abortSignal) {
    logger.info('[ONVIF Scanner] Initiating live SOAP WS-Discovery Probe...');
    eventBus.emit(Events.SCANNER_STARTED, { name: 'ONVIF', protocol: 'WS-Discovery' });

    const discovered = [];
    const ONVIF_PORT = 3702;
    const ONVIF_MULTICAST = '239.255.255.250';

    // Generate random message UUID
    const messageId = `urn:uuid:${Math.random().toString(36).substring(2, 11)}-${Math.random().toString(36).substring(2, 11)}`;

    // Build the standard SOAP WS-Discovery XML envelope for NetworkVideoTransmitter types
    const soapEnvelope = 
      '<?xml version="1.0" encoding="utf-8"?>' +
      '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" ' +
      'xmlns:a="http://schemas.xmlsoap.org/ws/2004/08/addressing" ' +
      'xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery" ' +
      'xmlns:dn="http://www.onvif.org/ver10/network/wsdl">' +
      '<soap:Header>' +
      `<a:MessageID>${messageId}</a:MessageID>` +
      '<a:To>urn:schemas-xmlsoap-org:ws:2004:08:discovery</a:To>' +
      '<a:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</a:Action>' +
      '</soap:Header>' +
      '<soap:Body>' +
      '<d:Probe>' +
      '<d:Types>dn:NetworkVideoTransmitter</d:Types>' +
      '</d:Probe>' +
      '</soap:Body>' +
      '</soap:Envelope>';

    logger.info(`$ soap-udp-probe --address 239.255.255.250:3702`);
    logger.info(`  >> Sending SOAP XML Probe: ${messageId}`);

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
        logger.warn('[ONVIF Scanner] Execution halted by cancellation signal.');
        cleanup();
        eventBus.emit(Events.SCANNER_ERROR, { name: 'ONVIF', error: 'Cancelled' });
        resolve(discovered);
      };

      abortSignal.addEventListener('abort', handleAbort);

      try {
        socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

        socket.on('error', (err) => {
          logger.error(`[ONVIF Scanner] Socket error: ${err.message}`);
          eventBus.emit(Events.SCANNER_ERROR, { name: 'ONVIF', error: err.message });
          cleanup();
          resolve(discovered);
        });

        socket.on('message', (msg, rinfo) => {
          const rawResponse = msg.toString();
          
          // Verify it's a WS-Discovery match payload
          if (!rawResponse.includes('ProbeMatches') && !rawResponse.includes('ProbeMatch')) return;

          logger.info(`  << Received SOAP XML ProbeMatch from ${rinfo.address}:${rinfo.port}`);

          // Extract endpoints and scopes using regex to avoid external XML library dependencies
          const scopesMatch = /<[a-zA-Z0-9:]*Scopes[^>]*>([\s\S]*?)<\/[a-zA-Z0-9:]*Scopes>/.exec(rawResponse);
          const xAddrsMatch = /<[a-zA-Z0-9:]*XAddrs[^>]*>([\s\S]*?)<\/[a-zA-Z0-9:]*XAddrs>/.exec(rawResponse);

          const scopesStr = scopesMatch ? scopesMatch[1].trim() : '';
          const xAddrsStr = xAddrsMatch ? xAddrsMatch[1].trim() : '';

          const scopes = scopesStr ? scopesStr.split(/\s+/) : [];
          
          // Heuristics parsing of ONVIF scopes to extract metadata
          let vendor = null;
          let model = null;

          scopes.forEach(scope => {
            const nameMatch = /onvif:\/\/www\.onvif\.org\/name\/([a-zA-Z0-9_-]+)/i.exec(scope);
            if (nameMatch) {
              vendor = nameMatch[1];
            }
            const hwMatch = /onvif:\/\/www\.onvif\.org\/hardware\/([a-zA-Z0-9_-]+)/i.exec(scope);
            if (hwMatch) {
              model = hwMatch[1];
            }
          });

          // Print info to developers
          logger.info(`  << Camera Profile: Vendor=${vendor || 'Unknown'}, Model=${model || 'Unknown'}`);
          logger.info(`  << ONVIF Endpoint: ${xAddrsStr || 'N/A'}`);

          if (discovered.some(d => d.ip === rinfo.address)) {
            return;
          }

          const node = {
            ip: rinfo.address,
            mac: null,
            hostname: xAddrsStr || `${rinfo.address}_onvif`,
            vendor: vendor,
            model: model,
            isCamera: true,
            discoveryMethods: ['ONVIF'],
            rawPayloads: {
              onvifScopes: scopes,
              xAddrs: xAddrsStr
            }
          };

          discovered.push(node);
          eventBus.emit(Events.DEVICE_FOUND, node);
        });

        socket.bind({ address: localIp, port: 0 }, () => {
          try {
            socket.setMulticastTTL(4);
            const buffer = Buffer.from(soapEnvelope);
            
            socket.send(buffer, 0, buffer.length, ONVIF_PORT, ONVIF_MULTICAST, (err) => {
              if (err) {
                logger.error(`[ONVIF Scanner] UDP Multicast send failed: ${err.message}`);
                cleanup();
                resolve(discovered);
              }
            });
          } catch (bindErr) {
            logger.error(`[ONVIF Scanner] Socket setup failed: ${bindErr.message}`);
            cleanup();
            resolve(discovered);
          }
        });

        // Listen for SOAP responses (default 3s)
        const timeoutMs = Settings.onvifTimeoutMs || 3000;

        const progressInterval = setInterval(() => {
          if (completed) {
            clearInterval(progressInterval);
            return;
          }
          eventBus.emit(Events.SCANNER_PROGRESS, { name: 'ONVIF', progress: 50, message: 'Broadcasting XML SOAP envelopes...' });
        }, 1000);

        setTimeout(() => {
          clearInterval(progressInterval);
          if (completed) return;
          logger.info(`[ONVIF Scanner] Broadcast finished. Found ${discovered.length} ONVIF transmitters.`);
          eventBus.emit(Events.SCANNER_FINISHED, { name: 'ONVIF', discoveredCount: discovered.length });
          cleanup();
          resolve(discovered);
        }, timeoutMs);

      } catch (err) {
        logger.error(`[ONVIF Scanner] Initialization crashed: ${err.message}`);
        cleanup();
        resolve(discovered);
      }
    });
  }
};
