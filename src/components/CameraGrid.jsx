import React from 'react';
import CameraCard from './CameraCard.jsx';

export default function CameraGrid({ devices, showCamerasOnly, setShowCamerasOnly, onSelectDevice }) {
  return (
    <section className="devices-section">
      <div className="section-header-row">
        <h2>Discovered Devices ({devices.length})</h2>
        <label className="toggle-label">
          <input 
            type="checkbox" 
            checked={showCamerasOnly} 
            onChange={(e) => setShowCamerasOnly(e.target.checked)} 
          />
          Show Cameras Only
        </label>
      </div>
      <div className="devices-grid">
        {devices.map((dev) => (
          <CameraCard key={dev.id} device={dev} onSelectDevice={onSelectDevice} />
        ))}
        {devices.length === 0 && (
          <div className="empty-state">
            <p>No camera devices found. Click "Start Network Scan" to begin discovery.</p>
          </div>
        )}
      </div>
    </section>
  );
}
