import { useState, useEffect, useCallback, useRef } from 'react';
import { useEventSource } from './useEventSource.js';

/**
 * Camera health monitoring hook.
 *
 * Responsibilities:
 *  1. Starts health monitoring via POST /api/v1/monitor/start/:id on mount
 *  2. Subscribes to 'health_update' SSE events and filters by cameraId
 *  3. Provides live health snapshot and event timeline state
 *  4. Stops monitoring via POST /api/v1/monitor/stop/:id on unmount
 *
 * @param {string|null} cameraId - The camera's normalized ID
 * @param {number} [intervalMs=30000] - Health check interval
 * @returns {{ health: object|null, events: Array, monitoring: boolean, error: string|null }}
 */
export function useCameraHealth(cameraId, intervalMs = 30_000) {
  const [health, setHealth] = useState(null);
  const [events, setEvents] = useState([]);
  const [monitoring, setMonitoring] = useState(false);
  const [error, setError] = useState(null);
  const activeIdRef = useRef(cameraId);

  // Start monitoring on mount, stop on unmount
  useEffect(() => {
    if (!cameraId) return;
    activeIdRef.current = cameraId;

    let stopped = false;

    const startMonitoring = async () => {
      try {
        const res = await fetch(`/api/v1/monitor/start/${cameraId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ intervalMs }),
        });
        const data = await res.json();

        if (stopped) return; // Component unmounted before response

        if (data.success) {
          setMonitoring(true);
          setError(null);

          // Load existing snapshot/events immediately (if camera was previously monitored)
          const statusRes = await fetch(`/api/v1/monitor/status/${cameraId}`);
          const statusData = await statusRes.json();
          if (!stopped && statusData.success) {
            if (statusData.snapshot) setHealth(statusData.snapshot);
            if (statusData.events?.length) setEvents(statusData.events);
          }
        } else {
          setError(data.error || 'Failed to start monitoring.');
        }
      } catch (err) {
        if (!stopped) setError(`Monitoring unavailable: ${err.message}`);
      }
    };

    startMonitoring();

    return () => {
      stopped = true;
      // Stop monitoring when the workspace is unmounted
      fetch(`/api/v1/monitor/stop/${cameraId}`, { method: 'POST' }).catch(() => {});
      setMonitoring(false);
    };
  }, [cameraId]);

  // SSE handler — only process events for THIS camera
  const handleHealthUpdate = useCallback((payload) => {
    if (payload.cameraId !== activeIdRef.current) return;
    if (payload.snapshot) setHealth(payload.snapshot);
    if (payload.events) setEvents(payload.events);
  }, []);

  const handleCameraEvent = useCallback((payload) => {
    if (payload.cameraId !== activeIdRef.current) return;
    if (payload.event) {
      setEvents(prev => {
        // Avoid duplicates (may arrive via both health_update and camera_event)
        const alreadyPresent = prev.some(e => e.id === payload.event.id);
        return alreadyPresent ? prev : [...prev, payload.event];
      });
    }
  }, []);

  // Subscribe to the shared SSE stream (already open in DiscoveryPage)
  useEventSource('/api/v1/scan/stream', {
    health_update: handleHealthUpdate,
    camera_event: handleCameraEvent,
  }, !!cameraId);

  return { health, events, monitoring, error };
}
