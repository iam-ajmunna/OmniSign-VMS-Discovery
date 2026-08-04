import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sanitizer from '../server/utils/sanitizer.js';
import vendorResolver from '../server/services/vendorResolver.js';
import portIdentifier from '../server/services/portIdentifier.js';
import confidenceCalculator from '../server/services/confidenceCalculator.js';
import deviceDeduplicator from '../server/aggregator/deviceDeduplicator.js';
import deviceMerger from '../server/aggregator/deviceMerger.js';
import deviceStore from '../server/aggregator/deviceStore.js';
import rtspHelper from '../server/utils/rtspHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✖ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n==================================================');
console.log('  OmniSight VMS Discovery — Automated Test Suite  ');
console.log('==================================================\n');

// Test 1: IPv4 Sanitizer
console.log('[Test Suite 1: Input Sanitizer]');
assert(sanitizer.isValidIPv4('192.168.1.1') === true, 'Valid IPv4 address accepted');
assert(sanitizer.isValidIPv4('192.168.1.256') === false, 'Out of bounds octet rejected');
assert(sanitizer.isValidIPv4('invalid-ip') === false, 'Non-numeric IP string rejected');
assert(sanitizer.normalizeMac('00-11-22-33-44-55') === '00:11:22:33:44:55', 'Dash-separated MAC normalized to colon format');
assert(sanitizer.normalizeMac('001122334455') === '00:11:22:33:44:55', 'Bare MAC hex string normalized');

// Test 2: Vendor Resolution (MAC OUI & Router Exclusion)
console.log('\n[Test Suite 2: OUI Vendor Resolution]');
assert(vendorResolver.resolveVendor('bc:14:85:11:22:33') === 'Hikvision', 'Hikvision OUI resolved from MAC');
assert(vendorResolver.resolveVendor('00:40:8c:00:11:22') === 'Axis Communications', 'Axis OUI resolved from MAC');
assert(vendorResolver.isCameraVendor('Hikvision Digital Technology') === true, 'Hikvision recognized as camera vendor');
assert(vendorResolver.isCameraVendor('Apple, Inc.') === false, 'Apple recognized as non-camera vendor');
assert(vendorResolver.isCameraVendor('TP-Link') === false, 'Generic TP-Link router excluded from camera classification');
assert(vendorResolver.isCameraVendor('TP-Link Tapo C200') === true, 'TP-Link Tapo camera explicitly recognized');
assert(vendorResolver.isCameraVendor('TP-Link', { model: 'VIGI' }) === true, 'TP-Link with VIGI model context recognized as camera');
assert(vendorResolver.isCameraVendor('TP-Link', { openPorts: [{ port: 554 }] }) === true, 'TP-Link with RTSP port context recognized as camera');
assert(vendorResolver.isCameraVendor('TP-Link', { model: 'Deco X50' }) === false, 'TP-Link Deco router context excluded');

// Test 3: Port Identification
console.log('\n[Test Suite 3: Video Port Identification]');
assert(portIdentifier.identifyPort(554).service === 'RTSP', 'Port 554 identified as RTSP');
assert(portIdentifier.identifyPort(3702).service === 'ONVIF', 'Port 3702 identified as ONVIF');
assert(portIdentifier.hasCameraPorts([{ port: 554 }]) === true, 'RTSP port triggers camera port flag');
assert(portIdentifier.hasCameraPorts([{ port: 22 }]) === false, 'SSH port does not trigger camera port flag');

// Test 4: Dynamic Confidence Calculation
console.log('\n[Test Suite 4: Camera Confidence Calculator]');
const camDevice = {
  ip: '192.168.68.10',
  vendor: 'Hikvision',
  openPorts: [{ port: 554 }],
  discoveryMethods: ['ONVIF'],
  isCamera: true
};
const confidence = confidenceCalculator.calculateConfidence(camDevice);
assert(confidence >= 80, `Camera confidence score calculated accurately (${confidence}%)`);

// Test 5: Aggregation Deduplication & Merging
console.log('\n[Test Suite 5: Aggregation Deduplication & Merging]');
deviceStore.clear();

const device1 = { ip: '192.168.68.10', mac: 'bc:14:85:11:22:33', discoveryMethods: ['Ping'] };
const match1 = deviceDeduplicator.findMatch(device1);
assert(match1 === null, 'Deduplicator returns null for initial un-cached device');

const merged1 = deviceMerger.merge({}, device1);
deviceStore.add({ id: 'bc1485112233', ...merged1 });

const device2 = { ip: '192.168.68.10', mac: 'bc:14:85:11:22:33', discoveryMethods: ['SSDP'], vendor: 'Hikvision' };
const match2 = deviceDeduplicator.findMatch(device2);
assert(match2 !== null && match2.id === 'bc1485112233', 'Deduplicator resolves match by MAC authority');

const merged2 = deviceMerger.merge(match2, device2);
assert(merged2.discoveryMethods.includes('Ping') && merged2.discoveryMethods.includes('SSDP'), 'Discovery methods consolidated without duplicates');

// Test 6: Vendor Intelligence Database Integrity
console.log('\n[Test Suite 6: Vendor Intelligence Database Integrity]');
const ouiData = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/database/ieee_oui.json'), 'utf8'));
const vendorData = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/database/camera_vendors.json'), 'utf8'));
const fpData = JSON.parse(fs.readFileSync(path.join(__dirname, '../server/database/fingerprints.json'), 'utf8'));

assert(Object.keys(ouiData).length >= 50, `IEEE OUI database loaded (${Object.keys(ouiData).length} OUI prefixes)`);
assert(Object.keys(vendorData).length >= 8, `Camera vendors database loaded (${Object.keys(vendorData).length} canonical vendors)`);
assert(fpData.httpServerHeaders && fpData.ssdpHeaders, 'Protocol fingerprints database schema validated');

const hikvisionUrls = rtspHelper.generateRtspUrls('192.168.68.10', 'Hikvision');
assert(hikvisionUrls.some(u => u.url.includes('/Streaming/Channels/101')), 'RTSP templates dynamically populated from database');

console.log('\n==================================================');
console.log(`  Test Results: ${passed} Passed, ${failed} Failed`);
console.log('==================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
