import express from 'express';
import cors from 'cors';
import { Settings, getNetworkInterfaces } from './config/index.js';
import sseManager from './utils/sseManager.js';
import logger from './logger/structuredLogger.js';
import sessionCoordinator from './services/sessionCoordinator.js';
import rtspHelper from './utils/rtspHelper.js';
import onvifAuthService from './services/onvifAuthService.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health Endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    uptime: process.uptime(),
    activeScan: sessionCoordinator.isScanning(),
    timestamp: new Date().toISOString()
  });
});

// Network Interfaces & Subnets Endpoint
app.get('/api/v1/subnets', (req, res) => {
  try {
    const interfaces = getNetworkInterfaces();
    res.json({ success: true, interfaces });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate RTSP Stream URLs for Camera
app.post('/api/v1/camera/rtsp-urls', (req, res) => {
  const { ip, vendor, port, username, password } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required.' });
  }

  const urls = rtspHelper.generateRtspUrls(ip, vendor, port, username, password);
  res.json({ success: true, ip, vendor, urls });
});

// Interactive ONVIF Authentication Endpoint
app.post('/api/v1/camera/onvif-auth', async (req, res) => {
  const { ip, port, username, password } = req.body;
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required.' });
  }

  const result = await onvifAuthService.authenticate(ip, port || 80, username || 'admin', password || 'password');
  res.json(result);
});

// SSE Connection Endpoint
app.get('/api/v1/scan/stream', (req, res) => {
  sseManager.addClient(res);
});

// Trigger Scan API (Orchestrated by SessionCoordinator)
app.post('/api/v1/scan', (req, res) => {
  try {
    logger.info('API Trigger: Received scan initiation command.');
    const session = sessionCoordinator.startScan();
    res.json({ success: true, message: 'Scan session started.', sessionId: session.id });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// Cancel Scan API (Orchestrated by SessionCoordinator)
app.post('/api/v1/scan/cancel', (req, res) => {
  try {
    logger.info('API Trigger: Received scan cancellation command.');
    sessionCoordinator.cancelScan();
    res.json({ success: true, message: 'Scan session successfully cancelled.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = Settings.apiPort || 5001;
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`OmniSight VMS Discovery daemon running on http://localhost:${PORT}`);
});

const gracefulShutdown = (signal) => {
  logger.warn(`Received ${signal}. Shutting down server gracefully...`);
  if (sessionCoordinator.isScanning()) {
    sessionCoordinator.cancelScan();
  }
  server.close(() => {
    logger.info('Server closed. Process terminating.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
