import React from 'react';
import { exportToCsv, exportToJson } from '../utils/exportHelper.js';

export default function Header({ session, totalDiscovered, devices, triggerScan, cancelScan }) {
  const currentStatus = session?.status || session?.session?.status || 'idle';

  return (
    <header className="vms-header">
      <div className="logo-group">
        <h1>OmniSight VMS <span>Discovery</span></h1>
        <div className="status-indicator">
          <span className={`pulse-dot ${currentStatus === 'running' ? 'active' : 'idle'}`}></span>
          {String(currentStatus).toUpperCase()}
        </div>
      </div>

      <div className="quick-metrics">
        <div className="metric-item">
          <span className="metric-label">Devices Discovered:</span>
          <span className="metric-value">{totalDiscovered}</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Subnet:</span>
          <span className="metric-value accent">Auto Active LAN</span>
        </div>
      </div>

      <div className="action-group">
        <div className="export-dropdown">
          <button className="btn-sm btn-secondary" onClick={() => exportToCsv(devices)}>
            Export CSV
          </button>
          <button className="btn-sm btn-secondary" onClick={() => exportToJson(devices)}>
            Export JSON
          </button>
        </div>

        {currentStatus === 'running' ? (
          <button className="btn-sm btn-danger btn-pulse" onClick={cancelScan}>Cancel Scan</button>
        ) : (
          <button className="btn-sm btn-primary" onClick={triggerScan}>Start Network Scan</button>
        )}
      </div>
    </header>
  );
}
