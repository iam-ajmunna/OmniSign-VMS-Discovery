import React, { useState, useEffect } from 'react';

export default function OnvifModal({ device, onClose }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [authResult, setAuthResult] = useState(null);
  const [rtspUrls, setRtspUrls] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => {
    fetchRtspUrls();
  }, [device, username, password]);

  const fetchRtspUrls = async () => {
    try {
      const res = await fetch('/api/v1/camera/rtsp-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: device.ip,
          vendor: device.vendor,
          username,
          password
        })
      });
      const data = await res.json();
      if (data.success) {
        setRtspUrls(data.urls || []);
      }
    } catch (err) {
      console.error('Failed to fetch RTSP URLs:', err);
    }
  };

  const handleAuthenticate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthResult(null);

    try {
      const res = await fetch('/api/v1/camera/onvif-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: device.ip,
          port: 80,
          username,
          password
        })
      });
      const data = await res.json();
      setAuthResult(data);
    } catch (err) {
      setAuthResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!device) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Camera Details & ONVIF Auth ({device.ip})</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="device-summary-box">
            <p><strong>Vendor:</strong> {device.vendor || 'Unknown'}</p>
            <p><strong>Model:</strong> {device.model || 'N/A'}</p>
            <p><strong>MAC Address:</strong> {device.mac || 'N/A'}</p>
            <p><strong>Hostname:</strong> {device.hostname || 'N/A'}</p>
          </div>

          <form onSubmit={handleAuthenticate} className="auth-form">
            <h4>ONVIF Credentials & Verification</h4>
            <div className="input-row">
              <input 
                type="text" 
                placeholder="Username" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="modal-input"
              />
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="modal-input"
              />
              <button type="submit" className="btn-sm btn-primary" disabled={loading}>
                {loading ? 'Probing...' : 'Authenticate ONVIF'}
              </button>
            </div>
          </form>

          {authResult && (
            <div className={`auth-result-box ${authResult.success ? 'success' : 'error'}`}>
              {authResult.success ? (
                <>
                  <p className="status-pass">✔ Authenticated Successfully!</p>
                  <p><strong>Manufacturer:</strong> {authResult.manufacturer}</p>
                  <p><strong>Model:</strong> {authResult.model}</p>
                  <p><strong>Serial Number:</strong> {authResult.serialNumber}</p>
                  <p><strong>Firmware:</strong> {authResult.firmware}</p>
                </>
              ) : (
                <p className="status-fail">✖ {authResult.error}</p>
              )}
            </div>
          )}

          <div className="rtsp-section">
            <h4>RTSP Video Stream URLs</h4>
            {rtspUrls.map((item, idx) => (
              <div key={idx} className="rtsp-url-row">
                <div className="rtsp-info">
                  <span className="rtsp-label">{item.label}</span>
                  <code className="rtsp-code">{item.url}</code>
                </div>
                <button 
                  className="btn-sm btn-secondary" 
                  onClick={() => copyToClipboard(item.url, idx)}
                >
                  {copiedIndex === idx ? 'Copied!' : 'Copy URL'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
