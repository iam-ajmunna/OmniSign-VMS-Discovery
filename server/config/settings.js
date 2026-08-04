/**
 * Global application parameters and default limits.
 */
export const Settings = Object.freeze({
  // Express server port
  apiPort: 5001,
  
  // Timeout settings
  defaultScanTimeoutMs: 15000, // Hard stop scanner timeline (15 seconds)
  pingTimeoutMs: 150,          // Small timeouts for ping checks to sweep /24 LAN quickly
  tcpConnectTimeoutMs: 200,    // Connection sweeps timeout
  
  // Concurrency controls
  maxParallelPings: 64,        // Cap simultaneous spawned ping commands to prevent CPU lag
  maxParallelTcpProbes: 32      // Cap parallel TCP connection queries
});
