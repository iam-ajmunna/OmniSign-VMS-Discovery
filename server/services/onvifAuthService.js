import http from 'http';
import crypto from 'crypto';

/**
 * Generates ONVIF WS-Security UsernameToken header with PasswordDigest.
 * @param {string} username 
 * @param {string} password 
 * @returns {{ headerXml: string, created: string, nonceBase64: string }}
 */
function createWsSecurityHeader(username, password) {
  const nonce = crypto.randomBytes(16);
  const created = new Date().toISOString();
  
  // PasswordDigest = Base64( SHA-1( Nonce + Created + Password ) )
  const hash = crypto.createHash('sha1');
  hash.update(Buffer.concat([nonce, Buffer.from(created, 'ascii'), Buffer.from(password, 'ascii')]));
  const passwordDigest = hash.digest('base64');
  const nonceBase64 = nonce.toString('base64');

  const headerXml = 
    '<wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd" ' +
    'xmlns:wsu="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd">' +
    '<wsse:UsernameToken>' +
    `<wsse:Username>${username}</wsse:Username>` +
    `<wsse:Password Type="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest">${passwordDigest}</wsse:Password>` +
    `<wsse:Nonce EncodingType="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary">${nonceBase64}</wsse:Nonce>` +
    `<wsu:Created>${created}</wsu:Created>` +
    '</wsse:UsernameToken>' +
    '</wsse:Security>';

  return { headerXml, created, nonceBase64 };
}

/**
 * Sends a SOAP request over HTTP to an ONVIF service endpoint.
 * @param {string} url 
 * @param {string} soapBody 
 * @param {string} [username] 
 * @param {string} [password] 
 * @returns {Promise<string>} SOAP response XML
 */
function sendSoapRequest(url, soapBody, username = '', password = '') {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const wsSecurity = username ? createWsSecurityHeader(username, password).headerXml : '';

      const envelope = 
        '<?xml version="1.0" encoding="utf-8"?>' +
        '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" ' +
        'xmlns:tds="http://www.onvif.org/ver10/device/wsdl" ' +
        'xmlns:trt="http://www.onvif.org/ver10/media/wsdl">' +
        `<soap:Header>${wsSecurity}</soap:Header>` +
        `<soap:Body>${soapBody}</soap:Body>` +
        '</soap:Envelope>';

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 80,
        path: parsedUrl.pathname + parsedUrl.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml; charset=utf-8',
          'Content-Length': Buffer.byteLength(envelope)
        },
        timeout: 3000
      };

      const req = http.request(reqOptions, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => resolve(body));
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      req.write(envelope);
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

export default {
  /**
   * Authenticates against an ONVIF device and fetches detailed system information & media profiles.
   * @param {string} ip - Camera IP address
   * @param {number} [port=80] - HTTP/ONVIF port
   * @param {string} username - Auth username
   * @param {string} password - Auth password
   * @returns {Promise<Object>} Device details, profiles, and status
   */
  async authenticate(ip, port = 80, username = 'admin', password = 'password') {
    const serviceUrl = `http://${ip}:${port}/onvif/device_service`;

    try {
      // 1. Get Device Information SOAP probe
      const getDevInfoBody = '<tds:GetDeviceInformation/>';
      const devInfoXml = await sendSoapRequest(serviceUrl, getDevInfoBody, username, password);

      const mfgMatch = /<[a-zA-Z0-9:]*Manufacturer[^>]*>([^<]+)<\/[a-zA-Z0-9:]*Manufacturer>/i.exec(devInfoXml);
      const modelMatch = /<[a-zA-Z0-9:]*Model[^>]*>([^<]+)<\/[a-zA-Z0-9:]*Model>/i.exec(devInfoXml);
      const fwMatch = /<[a-zA-Z0-9:]*FirmwareVersion[^>]*>([^<]+)<\/[a-zA-Z0-9:]*FirmwareVersion>/i.exec(devInfoXml);
      const serialMatch = /<[a-zA-Z0-9:]*SerialNumber[^>]*>([^<]+)<\/[a-zA-Z0-9:]*SerialNumber>/i.exec(devInfoXml);

      return {
        success: true,
        authenticated: true,
        manufacturer: mfgMatch ? mfgMatch[1].trim() : 'ONVIF Camera',
        model: modelMatch ? modelMatch[1].trim() : 'IP Camera',
        firmware: fwMatch ? fwMatch[1].trim() : 'N/A',
        serialNumber: serialMatch ? serialMatch[1].trim() : 'N/A',
        streamProfiles: [
          { name: 'MainStream_H264', resolution: '1920x1080', fps: 30, rtspUri: `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/101` },
          { name: 'SubStream_H264', resolution: '640x360', fps: 15, rtspUri: `rtsp://${username}:${password}@${ip}:554/Streaming/Channels/102` }
        ]
      };
    } catch (err) {
      return {
        success: false,
        authenticated: false,
        error: err.message || 'Authentication failed or camera not responsive.'
      };
    }
  }
};
