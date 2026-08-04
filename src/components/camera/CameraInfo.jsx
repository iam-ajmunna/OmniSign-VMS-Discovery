import React, { useState } from 'react';

/**
 * Static Camera Information panel.
 * Displays device identity, network info, and connection endpoints.
 */
export default function CameraInfo({ device }) {
  const [showRtsp, setShowRtsp] = useState(false);

  if (!device) return null;

  const ports = (device.openPorts || []).map(p => `${p.port} (${p.service || 'Unknown'})`).join(' · ') || 'N/A';
  const rtspPort = (device.openPorts || []).find(p => [554, 8554].includes(p.port))?.port || 554;
  const rtspUrl = `rtsp://[user]:[pass]@${device.ip}:${rtspPort}/stream`;
  const onvifEndpoint = `http://${device.ip}:${(device.openPorts || []).find(p => p.port === 80 || p.port === 8080)?.port || 80}/onvif/device_service`;

  const Row = ({ label, value }) => (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value || 'N/A'}</span>
    </div>
  );

  return (
    <div className="ws-module">
      <div className="ws-module-header">
        <h3>📷 Camera Information</h3>
      </div>
      <div className="ws-module-body info-grid">
        <div className="info-section">
          <p className="info-section-title">Identity</p>
          <Row label="Manufacturer" value={device.vendor} />
          <Row label="Model" value={device.model} />
          <Row label="Serial Number" value={device.serial || 'Unknown'} />
          <Row label="Firmware" value={device.firmware || 'Unknown'} />
        </div>
        <div className="info-section">
          <p className="info-section-title">Network</p>
          <Row label="IP Address" value={device.ip} />
          <Row label="MAC Address" value={device.mac} />
          <Row label="Hostname" value={device.hostname} />
          <Row label="Open Ports" value={ports} />
        </div>
        <div className="info-section">
          <p className="info-section-title">Endpoints</p>
          <div className="info-row">
            <span className="info-label">RTSP URL</span>
            <span className="info-value info-code">
              {showRtsp ? rtspUrl : '••••••••••••'}
              <button className="btn-tiny" onClick={() => setShowRtsp(v => !v)}>
                {showRtsp ? 'Hide' : 'Show'}
              </button>
            </span>
          </div>
          <Row label="ONVIF Endpoint" value={onvifEndpoint} />
          <div className="info-row">
            <span className="info-label">Discovery Methods</span>
            <span className="info-value">
              {(device.discoveryMethods || []).join(', ') || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
