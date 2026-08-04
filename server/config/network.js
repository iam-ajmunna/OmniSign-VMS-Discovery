import os from 'os';

/**
 * Resolves the primary active physical network interface and returns its IP details.
 * Ensures compatibility across macOS, Windows, and Linux.
 * 
 * @returns {Object} Interface configurations
 * @property {string} ip - Host IPv4 address
 * @property {string} netmask - Host netmask (e.g. "255.255.255.0")
 * @property {string} subnet - CIDR subnet range (e.g. "192.168.1.0/24")
 * @property {string} interfaceName - Name of the network interface
 */
export function getActiveInterface() {
  const interfaces = os.networkInterfaces();
  
  // Prioritize physical adapters, filtering out common virtual ones
  const virtualPrefixes = ['docker', 'veth', 'vmnet', 'vbox', 'wsl', 'gif', 'stf', 'lo'];
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    const nameLower = name.toLowerCase();
    
    // Skip virtual adapters
    if (virtualPrefixes.some(prefix => nameLower.startsWith(prefix))) {
      continue;
    }
    
    for (const addr of addrs) {
      // Find IPv4, non-loopback addresses
      if (addr.family === 'IPv4' && !addr.internal) {
        // Exclude APIPA link-local addresses (168.254.x.x)
        if (addr.address.startsWith('169.254')) {
          continue;
        }
        
        const cidrParts = addr.cidr ? addr.cidr.split('/') : [];
        let subnet = '';
        
        if (cidrParts.length === 2) {
          // If node provides CIDR, calculate the base network address
          const ipNum = ipToLong(addr.address);
          const maskNum = cidrToMask(parseInt(cidrParts[1], 10));
          const networkNum = ipNum & maskNum;
          subnet = `${longToIp(networkNum)}/${cidrParts[1]}`;
        } else {
          // Fallback CIDR calculation from netmask
          const maskBits = netmaskToCidr(addr.netmask);
          const ipNum = ipToLong(addr.address);
          const maskNum = cidrToMask(maskBits);
          const networkNum = ipNum & maskNum;
          subnet = `${longToIp(networkNum)}/${maskBits}`;
        }
        
        return {
          ip: addr.address,
          netmask: addr.netmask,
          subnet: subnet,
          interfaceName: name
        };
      }
    }
  }
  
  // Return absolute default (localhost loopback fallback)
  return {
    ip: '127.0.0.1',
    netmask: '255.255.255.0',
    subnet: '127.0.0.0/24',
    interfaceName: 'loopback'
  };
}

export function getNetworkInterfaces() {
  const active = getActiveInterface();
  return [active];
}

// Helpers for IP subnet calculations
function ipToLong(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function longToIp(long) {
  return [
    (long >>> 24) & 255,
    (long >>> 16) & 255,
    (long >>> 8) & 255,
    long & 255
  ].join('.');
}

function cidrToMask(bits) {
  return bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
}

function netmaskToCidr(netmask) {
  const parts = netmask.split('.');
  let bits = 0;
  for (const part of parts) {
    const val = parseInt(part, 10);
    bits += Math.clz32(~val & 255) - 24;
  }
  return bits;
}
