import React from 'react';
import MetricCard from './MetricCard.jsx';

/**
 * Device Performance Panel.
 * Populated via ONVIF GetDeviceInformation / GetSystemStatus in Milestone 5.
 */
export default function PerformancePanel({ health }) {
  const perf = health?.performance;

  return (
    <div className="ws-module">
      <div className="ws-module-header">
        <h3>⚙️ Device Performance</h3>
        <span className={`module-status-chip ${perf ? 'chip-success' : 'chip-pending'}`}>
          {perf ? 'Telemetry Active' : 'Telemetry Offline'}
        </span>
      </div>
      <div className="ws-module-body metrics-grid">
        <MetricCard label="CPU Usage"        value={perf?.cpuPercent ?? null}  unit="%" unavailable={perf?.cpuPercent === undefined && !!perf} />
        <MetricCard label="Memory Usage"     value={perf?.memPercent ?? null}  unit="%" unavailable={perf?.memPercent === undefined && !!perf} />
        <MetricCard label="Temperature"      value={perf?.tempCelsius ?? null} unit="°C" unavailable={perf?.tempCelsius === undefined && !!perf} />
        <MetricCard label="Storage Status"   value={perf?.storageStatus ?? null} unavailable={perf?.storageStatus === undefined && !!perf} />
        <MetricCard label="Uptime"           value={perf?.uptime ?? null} unavailable={perf?.uptime === undefined && !!perf} />
        <MetricCard label="Recording Status" value={perf?.recording ?? null} unavailable={perf?.recording === undefined && !!perf} />
      </div>
      {!perf && (
        <p className="module-pending-note">Telemetry activates when camera is online.</p>
      )}
    </div>
  );
}
