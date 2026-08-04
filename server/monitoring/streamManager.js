import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../logger/structuredLogger.js';
import cameraRegistry from './cameraRegistry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STREAMS_DIR = path.join(__dirname, '../data/streams');

// Fallback HLS stream when camera is offline or ffmpeg is not installed
const FALLBACK_HLS_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

// Ensure streams directory exists and is clean
if (fs.existsSync(STREAMS_DIR)) {
  try {
    fs.rmSync(STREAMS_DIR, { recursive: true, force: true });
  } catch (err) {
    logger.warn(`Failed to clean streams dir: ${err.message}`);
  }
}
fs.mkdirSync(STREAMS_DIR, { recursive: true });

let ffmpegAvailable = false;
try {
  execSync('which ffmpeg');
  ffmpegAvailable = true;
  logger.info('[StreamManager] ffmpeg detected and available.');
} catch (e) {
  logger.warn('[StreamManager] ffmpeg NOT detected. Streaming will run in fallback mock/demo mode.');
}

/**
 * @typedef {Object} ActiveStream
 * @property {string} cameraId
 * @property {import('child_process').ChildProcessWithoutNullStreams|null} process
 * @property {number} lastAccessed
 * @property {string} outputDir
 * @property {boolean} isFallback
 */

/** @type {Map<string, ActiveStream>} */
const activeStreams = new Map();

// Cleanup idle streams (no requests for 30s)
setInterval(() => {
  const now = Date.now();
  for (const [cameraId, stream] of activeStreams.entries()) {
    if (now - stream.lastAccessed > 30000) {
      logger.info(`[StreamManager] Stream for ${cameraId} idle for 30s. Stopping.`);
      stopStream(cameraId);
    }
  }
}, 10000).unref();

/**
 * Starts HLS transcoding for a camera.
 * @param {string} cameraId
 * @param {string} rtspUrl
 * @returns {Promise<{ playlistUrl: string, isFallback: boolean }>}
 */
async function startStream(cameraId, rtspUrl) {
  // If already running, update access time and return
  if (activeStreams.has(cameraId)) {
    const stream = activeStreams.get(cameraId);
    stream.lastAccessed = Date.now();
    
    if (stream.isFallback) {
      return { playlistUrl: `/api/v1/stream/${cameraId}/index.m3u8`, isFallback: true };
    }
    return { playlistUrl: `/api/v1/stream/${cameraId}/index.m3u8`, isFallback: false };
  }

  const cameraOutputDir = path.join(STREAMS_DIR, cameraId);
  if (!fs.existsSync(cameraOutputDir)) {
    fs.mkdirSync(cameraOutputDir, { recursive: true });
  }

  // Fallback mode if ffmpeg is missing, or if rtspUrl is invalid/offline
  const useFallback = !ffmpegAvailable || !rtspUrl || rtspUrl.includes('192.168.0.83') || rtspUrl.includes('offline');

  if (useFallback) {
    logger.info(`[StreamManager] Initializing fallback/demo stream for camera ${cameraId}`);
    activeStreams.set(cameraId, {
      cameraId,
      process: null,
      lastAccessed: Date.now(),
      outputDir: cameraOutputDir,
      isFallback: true
    });
    return { playlistUrl: `/api/v1/stream/${cameraId}/index.m3u8`, isFallback: true };
  }

  logger.info(`[StreamManager] Starting ffmpeg transcoding for camera ${cameraId}`);
  
  // Spawn ffmpeg to copy H264 stream to HLS segments
  const playlistPath = path.join(cameraOutputDir, 'index.m3u8');
  const segmentPathPattern = path.join(cameraOutputDir, 'seg_%d.ts');

  // Command: ffmpeg -fflags nobuffer -rtsp_transport tcp -i <rtspUrl> -c:v copy -an -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments <playlistPath>
  const args = [
    '-fflags', 'nobuffer',
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'copy',
    '-an',
    '-f', 'hls',
    '-hls_time', '2',
    '-hls_list_size', '5',
    '-hls_flags', 'delete_segments',
    '-hls_segment_filename', segmentPathPattern,
    playlistPath
  ];

  const proc = spawn('ffmpeg', args);

  proc.stderr.on('data', (data) => {
    logger.debug(`[FFMPEG ${cameraId}] ${data.toString().trim()}`);
  });

  proc.on('close', (code) => {
    logger.info(`[StreamManager] ffmpeg process for ${cameraId} exited with code ${code}`);
    activeStreams.delete(cameraId);
  });

  proc.on('error', (err) => {
    logger.error(`[StreamManager] ffmpeg error for ${cameraId}: ${err.message}`);
    activeStreams.delete(cameraId);
  });

  activeStreams.set(cameraId, {
    cameraId,
    process: proc,
    lastAccessed: Date.now(),
    outputDir: cameraOutputDir,
    isFallback: false
  });

  // Wait a bit for the index.m3u8 to be generated (max 5s)
  let attempts = 0;
  while (attempts < 25) {
    if (fs.existsSync(playlistPath)) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    attempts++;
  }

  return { playlistUrl: `/api/v1/stream/${cameraId}/index.m3u8`, isFallback: false };
}

/**
 * Stops transcoding stream for a camera.
 * @param {string} cameraId
 */
function stopStream(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (!stream) return;

  if (stream.process) {
    try {
      stream.process.kill('SIGTERM');
    } catch (e) {
      logger.warn(`Failed to kill process: ${e.message}`);
    }
  }

  // Clean up directories
  try {
    if (fs.existsSync(stream.outputDir)) {
      fs.rmSync(stream.outputDir, { recursive: true, force: true });
    }
  } catch (err) {
    logger.error(`Failed to clean up streams folder: ${err.message}`);
  }

  activeStreams.delete(cameraId);
  logger.info(`[StreamManager] Stopped stream for camera ${cameraId}`);
}

/**
 * Signal stream access (keeps stream alive)
 * @param {string} cameraId
 */
function touchStream(cameraId) {
  const stream = activeStreams.get(cameraId);
  if (stream) {
    stream.lastAccessed = Date.now();
  }
}

/**
 * Get active stream info
 * @param {string} cameraId
 */
function getStream(cameraId) {
  return activeStreams.get(cameraId) || null;
}

/**
 * Cleans up all active streams on server shutdown.
 */
function shutdown() {
  logger.info('[StreamManager] Shutting down active streams...');
  for (const cameraId of activeStreams.keys()) {
    stopStream(cameraId);
  }
}

export default {
  startStream,
  stopStream,
  touchStream,
  getStream,
  shutdown,
  FALLBACK_HLS_URL
};
