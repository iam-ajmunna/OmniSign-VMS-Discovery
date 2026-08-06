import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ffmpegStatic from 'ffmpeg-static';
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
let ffmpegBinPath = 'ffmpeg';

const candidatePaths = [
  ffmpegStatic,
  'ffmpeg',
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg',
  '/usr/bin/ffmpeg'
].filter(Boolean);

for (const bin of candidatePaths) {
  try {
    execSync(`"${bin}" -version`, { stdio: 'ignore' });
    ffmpegAvailable = true;
    ffmpegBinPath = bin;
    logger.info(`[StreamManager] ffmpeg detected and available at: ${bin}`);
    break;
  } catch (e) {
    // ignore and check next path
  }
}

if (!ffmpegAvailable) {
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
  const useFallback = !ffmpegAvailable || !rtspUrl || rtspUrl.includes('offline');

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

  // Optimized low-latency HLS FFmpeg args (1s segments, 3-segment window, low-delay flags)
  const args = [
    '-fflags', 'nobuffer+discardcorrupt',
    '-flags', 'low_delay',
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'copy',
    '-an',
    '-f', 'hls',
    '-hls_time', '1',
    '-hls_list_size', '3',
    '-hls_flags', 'delete_segments+omit_endlist+split_by_time',
    '-hls_segment_filename', segmentPathPattern,
    playlistPath
  ];

  const proc = spawn(ffmpegBinPath, args);

  let stderrBuffer = '';
  let ffmpegExited = false;

  proc.stderr.on('data', (data) => {
    const msg = data.toString();
    stderrBuffer += msg;
    logger.debug(`[FFMPEG ${cameraId}] ${msg.trim()}`);
  });

  proc.on('close', (code) => {
    logger.info(`[StreamManager] ffmpeg process for ${cameraId} exited with code ${code}`);
    ffmpegExited = true;
    activeStreams.delete(cameraId);
  });

  proc.on('error', (err) => {
    logger.error(`[StreamManager] ffmpeg error for ${cameraId}: ${err.message}`);
    ffmpegExited = true;
    activeStreams.delete(cameraId);
  });

  activeStreams.set(cameraId, {
    cameraId,
    process: proc,
    lastAccessed: Date.now(),
    outputDir: cameraOutputDir,
    isFallback: false
  });

  // Wait a bit for the index.m3u8 to be generated (max 10s)
  let attempts = 0;
  while (attempts < 50) {
    if (fs.existsSync(playlistPath)) {
      break;
    }
    if (ffmpegExited) {
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
    attempts++;
  }

  if (!fs.existsSync(playlistPath)) {
    stopStream(cameraId);
    let detailedErr = 'FFmpeg failed to create stream playlist.';
    if (stderrBuffer.includes('401 Unauthorized') || stderrBuffer.includes('authorization failed')) {
      detailedErr = 'RTSP Authentication Failed (401 Unauthorized). Please check camera username & password.';
    } else if (stderrBuffer.includes('Connection refused')) {
      detailedErr = 'Connection refused on RTSP port. Please verify camera IP and port.';
    } else if (stderrBuffer.includes('Server returned 404') || stderrBuffer.includes('method DESCRIBE failed')) {
      detailedErr = 'RTSP Stream Path not found on camera. Try selecting a different stream path.';
    } else if (stderrBuffer.length > 0) {
      const lines = stderrBuffer.trim().split('\n').slice(-3).join(' ');
      detailedErr = `FFmpeg transcoding failed: ${lines}`;
    }
    throw new Error(detailedErr);
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
 * Streams real-time fMP4 video directly from RTSP to express response stream (zero disk I/O, ~200ms latency).
 * @param {string} cameraId
 * @param {string} rtspUrl
 * @param {import('express').Response} res
 */
function streamDirectMp4(cameraId, rtspUrl, res) {
  logger.info(`[StreamManager] Starting direct fMP4 stream for ${cameraId}`);

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const args = [
    '-loglevel', 'quiet',
    '-fflags', 'nobuffer+discardcorrupt',
    '-flags', 'low_delay',
    '-rtsp_transport', 'tcp',
    '-i', rtspUrl,
    '-c:v', 'copy',
    '-an',
    '-f', 'mp4',
    '-movflags', 'empty_moov+default_base_moof+frag_every_frame+skip_sidx+skip_trailer',
    'pipe:1'
  ];

  const proc = spawn(ffmpegBinPath, args);

  proc.stdout.pipe(res);

  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    try {
      proc.stdout.unpipe(res);
      proc.kill('SIGTERM');
    } catch (e) {}
    logger.info(`[StreamManager] Closed direct fMP4 stream for ${cameraId}`);
  };

  res.on('close', cleanup);
  res.on('error', cleanup);
  proc.on('close', cleanup);
  proc.on('error', cleanup);
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
  streamDirectMp4,
  touchStream,
  getStream,
  shutdown,
  FALLBACK_HLS_URL
};
