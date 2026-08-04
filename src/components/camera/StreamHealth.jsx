import React from 'react';
import MetricCard from './MetricCard.jsx';
import HealthBadge from './HealthBadge.jsx';

/**
 * Stream Health Module — Shell (Milestone 1).
 * Live RTSP/ONVIF probes activated in Milestone 3.
 */
export default function StreamHealth({ health }) {
  const snapshot = health?.stream;

  return (
    <div className="ws-module">
      <div className="ws-module-header">
        <h3>📡 Stream Health</h3>
        <HealthBadge status={snapshot?.status || 'pending'} />
      </div>
      <div className="ws-module-body metrics-grid">
        <MetricCard label="RTSP Connected" value={snapshot?.active != null ? (snapshot.active ? 'Yes' : 'No') : null} status={snapshot?.active ? 'good' : 'bad'} />
        <MetricCard label="RTSP Port" value={snapshot?.port || null} />
        <MetricCard label="RTSP Response Code" value={snapshot?.responseCode || null} />
        <MetricCard label="Latency" value={snapshot?.latencyMs ?? null} unit="ms" status={snapshot?.latencyMs > 500 ? 'warn' : 'good'} />
        <MetricCard label="ONVIF Active" value={health?.onvif?.available != null ? (health.onvif.available ? 'Yes' : 'No') : null} status={health?.onvif?.available ? 'good' : 'bad'} />
        <MetricCard label="ONVIF Auth" value={health?.onvif?.authenticated != null ? (health.onvif.authenticated ? 'Yes' : 'No') : null} status={health?.onvif?.authenticated ? 'good' : 'warn'} />
      </div>
      {!snapshot && (
        <p className="module-pending-note">Stream analysis activating...</p>
      )}
    </div>
  );
}
