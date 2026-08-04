import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DiscoveryPage from './pages/DiscoveryPage.jsx';
import CameraPage from './pages/CameraPage.jsx';

/**
 * Application router shell.
 * Route "/"           -> Discovery Dashboard (network scan + device grid)
 * Route "/camera/:id" -> Camera Workspace (health monitoring, live view)
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DiscoveryPage />} />
      <Route path="/camera/:id" element={<CameraPage />} />
    </Routes>
  );
}
