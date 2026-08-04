import React from 'react';

/**
 * Single-value metric display card used throughout the Camera Workspace.
 * @param {string} label - Metric name
 * @param {string|number} value - Current metric value
 * @param {string} [unit] - Unit suffix (e.g. "ms", "%", "fps")
 * @param {'good'|'warn'|'bad'|'neutral'} [status] - Drives value color
 * @param {boolean} [unavailable] - Shows "Not Supported" placeholder
 */
export default function MetricCard({ label, value, unit = '', status = 'neutral', unavailable = false }) {
  return (
    <div className="metric-card">
      <span className="metric-label">{label}</span>
      {unavailable ? (
        <span className="metric-value metric-unavailable">Not Supported</span>
      ) : (
        <span className={`metric-value metric-${status}`}>
          {value ?? '—'}{value != null && unit ? <small> {unit}</small> : ''}
        </span>
      )}
    </div>
  );
}
