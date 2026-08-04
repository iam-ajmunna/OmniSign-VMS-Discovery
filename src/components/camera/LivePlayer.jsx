import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';

export default function LivePlayer({ device, health }) {
  const [credentials, setCredentials] = useState({ username: 'admin', password: 'password' });
  const [revealed, setRevealed] = useState(false);
  
  const [streamState, setStreamState] = useState('idle'); // idle, connecting, streaming, error, fallback_warning
  const [errorMsg, setErrorMsg] = useState(null);
  const [playlistUrl, setPlaylistUrl] = useState(null);
  const [isFallback, setIsFallback] = useState(false);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  if (!device) return null;

  const isCameraOffline = health?.overall === 'offline';
  const rtspPort = (device.openPorts || []).find(p => [554, 8554].includes(p.port))?.port || 554;
  const rtspUrl = `rtsp://${credentials.username}:${credentials.password || '****'}@${device.ip}:${rtspPort}/stream`;

  // Start the stream
  const startStream = async (forceSimulation = false) => {
    setStreamState('connecting');
    setErrorMsg(null);

    try {
      const response = await fetch(`/api/v1/stream/${device.id}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rtspUrl: `rtsp://${credentials.username}:${credentials.password}@${device.ip}:${rtspPort}/stream`
        }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.isFallback && !forceSimulation) {
          // ffmpeg is missing or offline, display warning first instead of playing cartoon directly
          setIsFallback(true);
          setPlaylistUrl(data.playlistUrl);
          setStreamState('fallback_warning');
        } else {
          setPlaylistUrl(data.playlistUrl);
          setIsFallback(data.isFallback);
          setStreamState('streaming');
        }
      } else {
        throw new Error(data.error || 'Failed to initialize transcode session.');
      }
    } catch (err) {
      setErrorMsg(err.message);
      setStreamState('error');
    }
  };

  // Stop the stream
  const stopStream = async () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.src = '';
    }
    
    setStreamState('idle');
    setPlaylistUrl(null);
    setIsFallback(false);

    try {
      await fetch(`/api/v1/stream/${device.id}/stop`, { method: 'POST' });
    } catch (e) {
      console.warn('Failed to notify stream stop', e);
    }
  };

  // Clean up Hls & stop stream on unmount
  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
      fetch(`/api/v1/stream/${device.id}/stop`, { method: 'POST' }).catch(() => {});
    };
  }, [device.id]);

  // Load HLS stream when streaming state is active
  useEffect(() => {
    if (streamState !== 'streaming' || !playlistUrl || !videoRef.current) return;

    const video = videoRef.current;
    if (Hls.isSupported()) {
      const hls = new Hls({
        maxBufferSize: 0,
        maxBufferLength: 2,
        liveSyncPosition: 1,
      });
      hlsRef.current = hls;

      hls.loadSource(playlistUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setErrorMsg('HLS Playback failure.');
              setStreamState('error');
              stopStream();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = playlistUrl;
    } else {
      setErrorMsg('HLS streaming is not supported in this browser.');
      setStreamState('error');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamState, playlistUrl]);

  return (
    <div className="ws-module ws-module-player">
      <div className="ws-module-header">
        <h3>📹 Live Video</h3>
        {isCameraOffline ? (
          <span className="module-status-chip chip-error">Offline</span>
        ) : (
          <>
            {streamState === 'streaming' && (
              <span className={`module-status-chip ${isFallback ? 'chip-warning' : 'chip-success'}`}>
                {isFallback ? 'Simulated Feed' : 'Live Transcoding'}
              </span>
            )}
            {streamState === 'connecting' && (
              <span className="module-status-chip chip-pending">Connecting...</span>
            )}
            {streamState === 'idle' && (
              <span className="module-status-chip chip-live">Ready</span>
            )}
            {streamState === 'fallback_warning' && (
              <span className="module-status-chip chip-warning">Dependency Alert</span>
            )}
            {streamState === 'error' && (
              <span className="module-status-chip chip-error">Error</span>
            )}
          </>
        )}
      </div>

      <div className="ws-module-body">
        {/* Case 1: Camera is offline */}
        {isCameraOffline && (
          <div className="player-placeholder" style={{ borderColor: 'rgba(239, 68, 68, 0.15)', background: 'rgba(239, 68, 68, 0.02)' }}>
            <div className="player-icon" style={{ color: 'var(--color-danger)', opacity: 0.6 }}>🚫</div>
            <p className="player-title" style={{ color: 'var(--color-danger)' }}>CAMERA OFFLINE — NO SIGNAL</p>
            <p className="player-sub" style={{ maxWidth: '480px' }}>
              The camera at <strong>{device.ip}</strong> is unreachable. Streaming is unavailable.<br />
              Please check the camera power supply (PoE/12V), network connections, or IP configuration.
            </p>
            <div className="player-url-preview" style={{ marginTop: '0.5rem' }}>
              <span className="info-label">Expected Target Endpoint</span>
              <code>{rtspUrl}</code>
            </div>
          </div>
        )}

        {/* Case 2: Camera is online, but transcoding setup not started */}
        {!isCameraOffline && streamState === 'idle' && (
          <div className="player-placeholder">
            <div className="player-icon">▶</div>
            <p className="player-title">Transcoding Channel Setup</p>
            <p className="player-sub">
              Browser playback requires transcoding the RTSP video stream to HLS format.<br />
              Enter device login details below to initialize the transcoder.
            </p>
            <div className="player-cred-row">
              <input
                className="ws-input"
                type="text"
                placeholder="Username"
                value={credentials.username}
                onChange={e => setCredentials(p => ({ ...p, username: e.target.value }))}
              />
              <input
                className="ws-input"
                type={revealed ? 'text' : 'password'}
                placeholder="Password"
                value={credentials.password}
                onChange={e => setCredentials(p => ({ ...p, password: e.target.value }))}
              />
              <button className="btn-tiny" onClick={() => setRevealed(v => !v)}>
                {revealed ? 'Hide' : 'Show'}
              </button>
            </div>
            <button className="btn-primary" style={{ marginTop: '0.5rem' }} onClick={() => startStream(false)}>
              Start HLS Transcoder
            </button>
            <div className="player-url-preview">
              <span className="info-label">Source URL Target</span>
              <code>{rtspUrl}</code>
            </div>
          </div>
        )}

        {/* Case 3: Pipeline connection loader */}
        {!isCameraOffline && streamState === 'connecting' && (
          <div className="player-placeholder">
            <div className="spinner" />
            <p className="player-title" style={{ marginTop: '1rem' }}>Starting Transcoding Pipeline...</p>
            <p className="player-sub">Spawning ffmpeg buffer context and checking target socket.</p>
          </div>
        )}

        {/* Case 4: Transcoder missing (ffmpeg not installed) warning */}
        {!isCameraOffline && streamState === 'fallback_warning' && (
          <div className="player-placeholder" style={{ borderColor: 'rgba(245, 158, 11, 0.2)', background: 'rgba(245, 158, 11, 0.02)' }}>
            <div className="player-icon" style={{ color: 'var(--color-warning)', opacity: 0.8 }}>⚠</div>
            <p className="player-title" style={{ color: 'var(--color-warning)' }}>TRANSCODER DEPENDENCY MISSING</p>
            <p className="player-sub" style={{ maxWidth: '520px' }}>
              <strong>ffmpeg</strong> was not found on this system. Real-time HLS transcoding of physical RTSP streams requires installing ffmpeg on the VMS daemon server.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button className="btn-secondary btn-tiny" onClick={stopStream}>
                Cancel
              </button>
              <button className="btn-primary btn-tiny" onClick={() => startStream(true)}>
                Launch Dev Simulation Feed
              </button>
            </div>
          </div>
        )}

        {/* Case 5: Active Video Feed */}
        {!isCameraOffline && streamState === 'streaming' && (
          <div className="live-video-container" style={{ position: 'relative' }}>
            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                maxHeight: '400px',
                borderRadius: '8px',
                background: '#000',
                display: 'block'
              }}
            />
            <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {isFallback ? 'Showing simulated development feed' : `Transcoding active: ${playlistUrl}`}
              </span>
              <button className="btn-secondary btn-tiny" onClick={stopStream}>
                Stop Transcoding
              </button>
            </div>
          </div>
        )}

        {/* Case 6: Stream errors */}
        {!isCameraOffline && streamState === 'error' && (
          <div className="player-placeholder" style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            <div className="player-icon" style={{ opacity: 0.8, color: 'var(--color-danger)' }}>✖</div>
            <p className="player-title">Transcoding Failure</p>
            <p className="player-sub" style={{ color: 'var(--color-danger)' }}>{errorMsg}</p>
            <button className="btn-secondary" style={{ marginTop: '0.5rem' }} onClick={stopStream}>
              Back to Configuration
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
