import React from 'react';
import MetricCard from './MetricCard.jsx';
import HealthBadge from './HealthBadge.jsx';

/**
 * Network Health Module — Shell (Milestone 1).
 * Live probes activated in Milestone 2.
 */
export default function NetworkHealth({ health }) {
  const snapshot = health?.network;

  return (
    <div className="ws-module">
      <div className="ws-module-header">
        <h3>🌐 Network Health</h3>
        <HealthBadge status={snapshot?.status || 'pending'} />
      </div>
      <div className="ws-module-body metrics-grid">
        <MetricCard label="Reachability" value={snapshot ? (snapshot.reachable ? 'Online' : 'Offline') : null} status={snapshot?.reachable ? 'good' : 'bad'} />
        <MetricCard label="Ping Latency" value={snapshot?.latencyMs ?? null} unit="ms" status={snapshot?.latencyMs < 50 ? 'good' : snapshot?.latencyMs < 150 ? 'warn' : 'bad'} />
        <MetricCard label="RTSP Port 554" value={snapshot?.ports?.[554] ? 'Open' : snapshot ? 'Closed' : null} status={snapshot?.ports?.[554] ? 'good' : 'bad'} />
        <MetricCard label="ONVIF Port 80" value={snapshot?.ports?.[80] ? 'Open' : snapshot ? 'Closed' : null} status={snapshot?.ports?.[80] ? 'good' : 'neutral'} />
        <MetricCard label="HTTP" value={snapshot?.ports?.[80] ? 'Available' : snapshot ? 'N/A' : null} status={snapshot?.ports?.[80] ? 'good' : 'neutral'} />
        <MetricCard label="HTTPS" value={snapshot?.ports?.[443] ? 'Available' : snapshot ? 'N/A' : null} status={snapshot?.ports?.[443] ? 'good' : 'neutral'} />
      </div>
      {!snapshot && (
        <p className="module-pending-note">Health monitoring will activate when you open this workspace after scanning.</p>
      )}
    </div>
  );
}
