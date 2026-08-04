import React from 'react';

export default function ProgressGrid({ progress, session }) {
  const protocols = ['ARP', 'Ping', 'SSDP', 'mDNS', 'ONVIF'];
  const currentStatus = session?.status || session?.session?.status || 'idle';

  return (
    <section className="progress-section">
      <h2>Scanner Statuses</h2>
      <div className="progress-grid">
        {protocols.map((protocol) => {
          const state = progress[protocol] || {};
          let statusClass = 'status-idle';
          let statusLabel = 'Waiting...';

          if (state.status === 'running' || state.type === 'started' || state.type === 'progress') {
            statusClass = 'status-active';
            statusLabel = state.message || `${state.progress || 0}%`;
          } else if (state.status === 'finished' || state.type === 'finished') {
            statusClass = 'status-done';
            statusLabel = `Completed (${state.discoveredCount || 0} found)`;
          } else if (state.status === 'error' || state.type === 'error') {
            statusClass = 'status-error';
            statusLabel = state.error || 'Failed';
          } else if (currentStatus === 'completed' || currentStatus === 'finished') {
            statusClass = 'status-done';
            statusLabel = 'Completed (0 found)';
          } else if (currentStatus === 'cancelled') {
            statusClass = 'status-idle';
            statusLabel = 'Cancelled';
          }

          return (
            <div key={protocol} className={`progress-card ${statusClass}`}>
              <h4>{protocol}</h4>
              <p>{statusLabel}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
