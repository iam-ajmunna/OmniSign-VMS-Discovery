import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useCameraHealth } from '../hooks/useCameraHealth.js';
import CameraInfo from '../components/camera/CameraInfo.jsx';
import NetworkHealth from '../components/camera/NetworkHealth.jsx';
import StreamHealth from '../components/camera/StreamHealth.jsx';
import ImageHealth from '../components/camera/ImageHealth.jsx';
import PerformancePanel from '../components/camera/PerformancePanel.jsx';
import EventTimeline from '../components/camera/EventTimeline.jsx';
import LivePlayer from '../components/camera/LivePlayer.jsx';
import HealthBadge from '../components/camera/HealthBadge.jsx';

/**
 * Camera Workspace Page.
 * Dedicated monitoring environment for a single discovered camera.
 * Device data is sourced from navigation state or fetched from /api/v1/devices/:id.
 */
export default function CameraPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [device, setDevice] = useState(location.state?.device || null);
  const [loading, setLoading] = useState(!device);
  const [error, setError] = useState(null);

  // Fetch device from API if not passed via navigation state (e.g. page refresh)
  useEffect(() => {
    if (device) return;
    setLoading(true);
    fetch(`/api/v1/devices/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDevice(data.device);
        } else {
          setError(data.error || 'Device not found.');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Live health monitoring — starts automatically, stops on unmount
  const { health, events, monitoring, error: healthError } = useCameraHealth(
    device ? id : null
  );

  if (loading) {
    return (
      <div className="workspace-loading">
        <div className="spinner" />
        <p>Loading camera workspace…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workspace-error">
        <h2>Camera Not Found</h2>
        <p>{error}</p>
        <p className="workspace-error-hint">
          The device may no longer be in the active session. Return to the dashboard and run a new scan.
        </p>
        <button className="btn-back" onClick={() => navigate('/')}>← Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="camera-workspace">
      {/* Top Navigation Bar */}
      <div className="workspace-topbar">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Discovery Dashboard
        </button>
        <div className="workspace-title">
          <h1>{device?.vendor || 'Camera'} Workspace</h1>
          <span className="workspace-subtitle">{device?.ip}</span>
          {device?.model && <span className="workspace-model">{device.model}</span>}
        </div>
        <div className="workspace-topbar-right">
          {monitoring && (
            <span className="monitor-active-chip">● Monitoring Active</span>
          )}
          {healthError && (
            <span className="monitor-error-chip" title={healthError}>⚠ Monitor Error</span>
          )}
          <HealthBadge status={health?.overall || 'pending'} />
        </div>
      </div>

      {/* Workspace Grid */}
      <div className="workspace-grid">

        {/* Column 1: Live Player (full width top) */}
        <div className="workspace-col-full">
          <LivePlayer device={device} health={health} />
        </div>

        {/* Column 2: Left — Health Modules */}
        <div className="workspace-col-left">
          <NetworkHealth health={health} />
          <StreamHealth health={health} />
          <PerformancePanel health={health} />
        </div>

        {/* Column 3: Right — Info + Image + Events */}
        <div className="workspace-col-right">
          <CameraInfo device={device} />
          <ImageHealth health={health} />
          <EventTimeline events={events} />
        </div>

      </div>
    </div>
  );
}
