import eventBus from '../events/eventBus.js';
import { Events } from '../events/eventNames.js';

export const LogLevels = {
  TRACE: 'TRACE',
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Structured Logger that formats messages and transmits them via the central Event Bus.
 * Ensures Express routing, scanners, and coordinators do not directly push logs to client SSE channels.
 */
class StructuredLogger {
  log(level, message, context = null) {
    const timestamp = new Date().toISOString();
    const logObj = {
      timestamp,
      level,
      message,
      context
    };

    // Print to standard server process stdout
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    console.log(`[${timestamp}] [${level}] ${message}${contextStr}`);

    // Emit event on global bus for streaming or visual displays
    eventBus.emit(Events.LOG_EMITTED, logObj);
  }

  trace(message, context) {
    this.log(LogLevels.TRACE, message, context);
  }

  debug(message, context) {
    this.log(LogLevels.DEBUG, message, context);
  }

  info(message, context) {
    this.log(LogLevels.INFO, message, context);
  }

  warn(message, context) {
    this.log(LogLevels.WARN, message, context);
  }

  error(message, context) {
    this.log(LogLevels.ERROR, message, context);
  }
}

const logger = new StructuredLogger();
export default logger;
