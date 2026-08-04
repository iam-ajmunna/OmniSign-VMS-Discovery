import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';
import logger from '../logger/structuredLogger.js';

class SseManager {
  constructor() {
    /** @type {import('express').Response[]} */
    this.clients = [];
    
    // Bind global event listeners to pipe state mutations automatically to all SSE connections
    this.setupEventListeners();

    // 15-second SSE heartbeat timer to keep long-running browser streams alive
    setInterval(() => {
      this.broadcastPing();
    }, 15000);
  }

  /**
   * Registers a new client connection response object.
   * @param {import('express').Response} res 
   */
  addClient(res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Content-Encoding': 'none',
      'X-Accel-Buffering': 'no' // Prevent proxy buffering (e.g. Nginx)
    });

    // Send empty ping to establish stream
    res.write(':\n\n');

    this.clients.push(res);
    logger.debug(`SSE Client connected. Active streams: ${this.clients.length}`);

    res.on('close', () => {
      this.removeClient(res);
    });
  }

  /**
   * Removes a closed client connection response object.
   * @param {import('express').Response} res 
   */
  removeClient(res) {
    this.clients = this.clients.filter(c => c !== res);
    logger.debug(`SSE Client disconnected. Active streams: ${this.clients.length}`);
  }

  /**
   * Sends a 15s heartbeat comment to prevent proxy timeouts.
   */
  broadcastPing() {
    this.clients.forEach(client => {
      try {
        client.write(': ping\n\n');
      } catch (err) {
        // Ignored
      }
    });
  }

  /**
   * Broadcasts standard SSE chunk format to all active channels.
   * @param {string} eventName - Custom SSE event key
   * @param {Object} data - Payload
   */
  broadcast(eventName, data) {
    const packet = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach(client => {
      try {
        client.write(packet);
      } catch (err) {
        // Handle broken pipe
      }
    });
  }

  /**
   * Listeners that bridge Node.js event bus triggers into clients' SSE streams.
   */
  setupEventListeners() {
    // Pipe all session events
    eventBus.on(Events.SCAN_STARTED, (session) => {
      this.broadcast('session', { type: 'started', session });
    });
    eventBus.on(Events.SCAN_FINISHED, (session) => {
      this.broadcast('session', { type: 'finished', session });
    });
    eventBus.on(Events.SCAN_CANCELLED, (session) => {
      this.broadcast('session', { type: 'cancelled', session });
    });

    // Pipe protocol scanner progress updates
    eventBus.on(Events.SCANNER_STARTED, (meta) => {
      this.broadcast('progress', { type: 'started', ...meta });
    });
    eventBus.on(Events.SCANNER_PROGRESS, (meta) => {
      this.broadcast('progress', { type: 'progress', ...meta });
    });
    eventBus.on(Events.SCANNER_FINISHED, (meta) => {
      this.broadcast('progress', { type: 'finished', ...meta });
    });
    eventBus.on(Events.SCANNER_ERROR, (meta) => {
      this.broadcast('progress', { type: 'error', ...meta });
    });

    // Pipe aggregated/deduplicated device updates
    eventBus.on(Events.DEVICE_UPDATED, (device) => {
      this.broadcast('device', device);
    });

    // Pipe device removal signals (e.g. key promotion from IP-key to MAC-key)
    eventBus.on(Events.DEVICE_REMOVED, ({ id }) => {
      this.broadcast('device_removed', { id });
    });

    // Pipe structured console logs
    eventBus.on(Events.LOG_EMITTED, (log) => {
      this.broadcast('log', log);
    });
  }
}

const sseManager = new SseManager();
export default sseManager;
