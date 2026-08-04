import React, { useState } from 'react';

/**
 * Compact camera discovery card shown in the Discovery Dashboard grid.
 * Provides quick RTSP copy, ONVIF details modal, and workspace navigation.
 */
export default function CameraCard({ device, onSelectDevice, onOpenWorkspace }) {
  const [copied, setCopied] = useState(false);
  if (!device) return null;

  const methods = Array.isArray(device.discoveryMethods) ? device.discoveryMethods : [];

  const handleCopyRtsp = () => {
    const rtspUrl = `rtsp://admin:password@${device.ip}:554/Streaming/Channels/101`;
    navigator.clipboard.writeText(rtspUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="device-card">
      <div className="card-header">
        <h3>{device.vendor || 'Unknown Vendor'}</h3>
        <span className="confidence-badge">Confidence: {device.confidence || 0}%</span>
      </div>
      <div className="card-body">
        <p><strong>IP Address:</strong> {device.ip || 'N/A'}</p>
        <p><strong>MAC Address:</strong> {device.mac || 'N/A'}</p>
        <p><strong>Hostname:</strong> {device.hostname || 'N/A'}</p>
        <p><strong>Model:</strong> {device.model || 'N/A'}</p>
        <div className="protocols-row">
          {methods.map((method) => (
            <span key={method} className="method-badge">{method}</span>
          ))}
        </div>
      </div>
      <div className="card-actions">
        <button className="btn-card-action" onClick={handleCopyRtsp}>
          {copied ? 'Copied RTSP!' : 'Copy RTSP Stream'}
        </button>
        <button className="btn-card-action" onClick={() => onSelectDevice(device)}>
          ONVIF & Details
        </button>
        <button className="btn-card-action btn-card-primary" onClick={() => onOpenWorkspace(device)}>
          Open Workspace →
        </button>
      </div>
    </div>
  );
}
