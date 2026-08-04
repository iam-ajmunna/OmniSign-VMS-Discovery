import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import streamManager from '../monitoring/streamManager.js';
import logger from '../logger/structuredLogger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STREAMS_DIR = path.join(__dirname, '../data/streams');

const router = express.Router();

/**
 * POST /api/v1/stream/:cameraId/start
 * Starts transcoding or initializes fallback HLS stream.
 */
router.post('/:cameraId/start', async (req, res) => {
  const { cameraId } = req.params;
  const { rtspUrl } = req.body;

  try {
    const result = await streamManager.startStream(cameraId, rtspUrl);
    res.json({
      success: true,
      playlistUrl: result.playlistUrl,
      isFallback: result.isFallback
    });
  } catch (err) {
    logger.error(`[StreamRouter] Failed to start stream for ${cameraId}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/v1/stream/:cameraId/stop
 * Stops transcoding.
 */
router.post('/:cameraId/stop', (req, res) => {
  const { cameraId } = req.params;
  try {
    streamManager.stopStream(cameraId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/v1/stream/:cameraId/:filename
 * Serves the HLS playlist (.m3u8) or segments (.ts).
 * If the stream is in fallback/demo mode, it redirects the playlist request to a public test stream.
 */
router.get('/:cameraId/:filename', (req, res) => {
  const { cameraId, filename } = req.params;
  
  // Update last accessed timestamp to prevent idle shutdown
  streamManager.touchStream(cameraId);

  const streamInfo = streamManager.getStream(cameraId);
  
  if (streamInfo && streamInfo.isFallback) {
    // If it's a playlist request in fallback mode, redirect to the public test stream
    if (filename === 'index.m3u8') {
      logger.debug(`[StreamRouter] Redirecting fallback stream for ${cameraId} to Mux test stream`);
      return res.redirect(streamManager.FALLBACK_HLS_URL);
    }
  }

  const filePath = path.join(STREAMS_DIR, cameraId, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  // Set appropriate content types and CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (filename.endsWith('.m3u8')) {
    res.setHeader('Content-Type', 'application/x-mpegURL');
  } else if (filename.endsWith('.ts')) {
    res.setHeader('Content-Type', 'video/MP2T');
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    logger.error(`[StreamRouter] Error reading file ${filename}: ${err.message}`);
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  });
  stream.pipe(res);
});

export default router;
