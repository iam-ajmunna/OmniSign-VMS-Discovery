/**
 * JSDoc definitions for the Scan Session Model.
 * Represents metadata and telemetry of a network scan execution.
 * 
 * @typedef {Object} ScanStats
 * @property {number} totalDiscovered - Count of total network nodes discovered
 * @property {number} camerasCount - Count of high-certainty camera nodes
 * @property {Record<string, number>} protocolHits - Counts of discoveries mapped by scan protocols
 * 
 * @typedef {Object} ScanSession
 * @property {string} id - Unique UUID of the scan run
 * @property {string} status - Current session phase: "idle" | "running" | "completed" | "cancelled" | "failed"
 * @property {string} startTime - ISO 8601 string of initial trigger
 * @property {string|null} endTime - ISO 8601 string of completion or stop
 * @property {number} durationMs - Elapsed runtime in milliseconds
 * @property {ScanStats} stats - Discovery numbers
 */

export const SessionModelSchema = {
  id: '',
  status: 'idle',
  startTime: '',
  endTime: null,
  durationMs: 0,
  stats: {
    totalDiscovered: 0,
    camerasCount: 0,
    protocolHits: {}
  }
};
