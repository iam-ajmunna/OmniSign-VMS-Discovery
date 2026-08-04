import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import ProgressGrid from '../components/ProgressGrid.jsx';
import CameraGrid from '../components/CameraGrid.jsx';
import DevConsole from '../components/DevConsole.jsx';
import OnvifModal from '../components/OnvifModal.jsx';

export default function DiscoveryPage() {
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState({});
  const [session, setSession] = useState({ status: 'idle' });
  const [progress, setProgress] = useState({});
  const [logFilter, setLogFilter] = useState('ALL');
  const [showCamerasOnly, setShowCamerasOnly] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const navigate = useNavigate();
  const eventSourceRef = useRef(null);
  const consoleBottomRef = useRef(null);

  useEffect(() => {
    // 1. Fetch already discovered devices on load
    const fetchDevices = async () => {
      try {
        const res = await fetch('/api/v1/devices');
        const data = await res.json();
        if (data.success && data.devices) {
          const deviceMap = {};
          data.devices.forEach(dev => {
            deviceMap[dev.id] = dev;
          });
          setDevices(deviceMap);
        }
      } catch (err) {
        console.error('Failed to fetch existing devices:', err);
      }
    };
    fetchDevices();

    // 2. Fetch current scan session status
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/v1/health');
        const data = await res.json();
        if (data.activeScan) {
          setSession({ status: 'running' });
        }
      } catch (err) {
        console.error('Failed to fetch scanner status:', err);
      }
    };
    fetchSession();

    loggerClient('System connecting to SSE network stream...');
    const es = new EventSource('/api/v1/scan/stream');
    eventSourceRef.current = es;

    es.onopen = () => loggerClient('SSE Stream connected successfully. Ready.', 'INFO');

    es.addEventListener('log', (e) => {
      try { setLogs((prev) => [...prev, JSON.parse(e.data)]); }
      catch (err) { console.error('Failed to parse log event:', err); }
    });

    es.addEventListener('device', (e) => {
      try {
        const device = JSON.parse(e.data);
        setDevices((prev) => ({ ...prev, [device.id]: device }));
      } catch (err) { console.error('Failed to parse device event:', err); }
    });

    es.addEventListener('device_removed', (e) => {
      try {
        const { id } = JSON.parse(e.data);
        setDevices((prev) => { const next = { ...prev }; delete next[id]; return next; });
      } catch (err) { console.error('Failed to parse device_removed event:', err); }
    });

    es.addEventListener('session', (e) => {
      try {
        const data = JSON.parse(e.data);
        setSession(data.session || data);
      } catch (err) { console.error('Failed to parse session event:', err); }
    });

    es.addEventListener('progress', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.name) setProgress((prev) => ({ ...prev, [data.name]: data }));
      } catch (err) { console.error('Failed to parse progress event:', err); }
    });

    es.onerror = () => loggerClient('SSE connection lost. Reconnecting...', 'WARN');

    return () => es.close();
  }, []);

  useEffect(() => {
    if (consoleBottomRef.current) {
      consoleBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const loggerClient = (message, level = 'INFO') => {
    setLogs((prev) => [...prev, { timestamp: new Date().toISOString(), level, message: `[Client] ${message}` }]);
  };

  const triggerScan = async () => {
    try {
      loggerClient('Triggering scan request to host server...');
      setDevices({});
      setProgress({});
      const res = await fetch('/api/v1/scan', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start scan.');
      loggerClient(`Scan session initiated with ID: ${data.sessionId}`, 'INFO');
    } catch (err) { loggerClient(err.message, 'ERROR'); }
  };

  const cancelScan = async () => {
    try {
      loggerClient('Triggering cancel request...', 'INFO');
      const res = await fetch('/api/v1/scan/cancel', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel scan.');
    } catch (err) { loggerClient(err.message, 'ERROR'); }
  };

  const clearLogs = () => {
    setLogs([]);
    loggerClient('Console logs cleared.');
  };

  const isCameraDevice = (dev) => {
    if (dev.isCamera) return true;
    const vendorLower = (dev.vendor || '').toLowerCase();
    const cameraBrands = [
      'hikvision','ezviz','axis','dahua','imou','lorex','uniview','hanwha',
      'samsung','bosch','sony','panasonic','amcrest','reolink','foscam',
      'wyze','tuya','xiongmai','xmeye','cp plus','vivotek','mobotix',
      'ubiquiti','unifi','eufy','blink','ring','tapo','kasa','wansview',
      'annke','zosi','swann','night owl','defender','ycc365'
    ];
    if (cameraBrands.some(brand => vendorLower.includes(brand))) return true;
    if (dev.openPorts && dev.openPorts.some(p => [554,8000,3702,34567,8899,8554,7447].includes(p.port))) return true;
    if (dev.discoveryMethods && dev.discoveryMethods.includes('ONVIF')) return true;
    const hostLower = (dev.hostname || '').toLowerCase();
    const modelLower = (dev.model || '').toLowerCase();
    const keywords = ['camera','ipc','netcam','onvif','rtsp','nvr','dvr'];
    if (keywords.some(k => hostLower.includes(k) || modelLower.includes(k))) return true;
    return false;
  };

  const filteredDevicesList = Object.values(devices).filter(
    dev => !showCamerasOnly || isCameraDevice(dev)
  );

  return (
    <div className="vms-container">
      <Header
        session={session}
        totalDiscovered={filteredDevicesList.length}
        devices={filteredDevicesList}
        triggerScan={triggerScan}
        cancelScan={cancelScan}
      />
      <main className="vms-main">
        <ProgressGrid progress={progress} session={session} />
        <CameraGrid
          devices={filteredDevicesList}
          showCamerasOnly={showCamerasOnly}
          setShowCamerasOnly={setShowCamerasOnly}
          onSelectDevice={(dev) => setSelectedDevice(dev)}
          onOpenWorkspace={(dev) => navigate(`/camera/${dev.id}`, { state: { device: dev } })}
        />
      </main>
      <DevConsole
        logs={logs}
        logFilter={logFilter}
        setLogFilter={setLogFilter}
        clearLogs={clearLogs}
        consoleBottomRef={consoleBottomRef}
      />
      {selectedDevice && (
        <OnvifModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  );
}
