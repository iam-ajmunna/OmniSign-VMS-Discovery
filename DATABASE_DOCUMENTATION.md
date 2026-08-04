# Camera Vendor Intelligence Database — Documentation & Reference Guide

This document describes the structure, data fields, supported manufacturers, and protocol fingerprints powering the **Camera Vendor Intelligence Database**.

---

## 📁 Database Files & Schema Specifications

Location: `server/database/`

### 1. `ieee_oui.json` (IEEE MAC OUI Registry)
Maps 6-character hex MAC address prefixes to verified organization metadata.

**Fields**:
- `vendor`: Short canonical vendor string (e.g. `"Hikvision"`, `"Dahua Technology"`, `"Axis Communications"`).
- `org`: Full official organization name registered with IEEE.
- `country`: Two-letter ISO country code (e.g. `"CN"`, `"SE"`, `"DE"`, `"US"`, `"KR"`, `"JP"`, `"TW"`).

**Example Entry**:
```json
"bc1485": { 
  "vendor": "Hikvision", 
  "org": "Hangzhou Hikvision Digital Technology Co.,Ltd.", 
  "country": "CN" 
}
```

---

### 2. `camera_vendors.json` (Canonical Vendor Intelligence)
Contains detailed manufacturer profiles, aliases, OUI blocks, model prefixes, default video ports, and RTSP stream templates.

**Fields**:
- `canonicalName`: Primary brand name displayed in the UI.
- `aliases`: Array of alternate brand names, OEM labels, or subsidiary names.
- `ouis`: List of MAC OUI prefixes associated with this manufacturer.
- `modelPrefixes`: Common camera model numbers / SKU prefixes.
- `defaultPorts`: Typical open TCP/UDP video service ports (`554`, `80`, `8000`, `3702`, `34567`).
- `onvifSupported`: Boolean flag indicating ONVIF compliance.
- `rtspSupported`: Boolean flag indicating RTSP streaming support.
- `rtspTemplates`: Array of channel stream path objects (`label`, `path`).

**Example Entry**:
```json
"hikvision": {
  "canonicalName": "Hikvision",
  "aliases": ["Hikvision Digital Technology", "EZVIZ", "HiWatch"],
  "ouis": ["bc1485", "002363", "105bfa", "1868cb", "24acac", "2857be"],
  "modelPrefixes": ["DS-2CD", "DS-2DE", "DS-2DF", "DS-760", "CS-C6"],
  "defaultPorts": [554, 80, 8000, 3702],
  "onvifSupported": true,
  "rtspSupported": true,
  "rtspTemplates": [
    { "label": "Main Stream (H.264/H.265)", "path": "/Streaming/Channels/101" },
    { "label": "Sub Stream (Mobile)", "path": "/Streaming/Channels/102" }
  ]
}
```

---

### 3. `fingerprints.json` (Multi-Protocol Fingerprints)
Stores pattern rules for matching network protocol headers and payload strings.

**Fields**:
- `httpServerHeaders`: Rules matching HTTP `Server` headers.
- `wwwAuthenticateRealms`: Rules matching HTTP `WWW-Authenticate` auth realms.
- `onvifProfiles`: Rules matching ONVIF SOAP `ProbeMatches` XML strings.
- `ssdpHeaders`: Rules matching UPnP SSDP `LOCATION` or `SERVER` headers.
- `mdnsServices`: Rules matching ZeroConf `_rtsp._tcp.local` PTR responses.

---

## 🏭 Supported Surveillance Manufacturers Summary

| Category | Manufacturers Covered | Evidence & Protocols |
| :--- | :--- | :--- |
| **Enterprise** | Hikvision, Dahua Technology, Axis Communications, Hanwha Vision, Bosch Security, i-PRO (Panasonic), Avigilon, Pelco, Uniview, Vivotek, Mobotix, Sony, Honeywell, Cisco Meraki | IEEE OUI, ONVIF 3702, RTSP 554, HTTP Header, SSDP |
| **Commercial** | ACTi, Arecont Vision, GeoVision, Tiandy, Milesight, CP Plus, TVT Digital, Provision-ISR, ZKTeco, Digital Watchdog | IEEE OUI, ONVIF 3702, RTSP 554 |
| **Consumer / SMB** | Reolink, EZVIZ, TP-Link Tapo, TP-Link VIGI, Amcrest, Lorex, Swann, ANNKE, Imou, Ubiquiti UniFi Protect, Wyze Labs, Eufy | IEEE OUI, SSDP, mDNS, RTSP Templates |
| **OEM Manufacturers** | Xiongmai (XMeye port 34567), Longse, Sunell, Gwelltimes | Port 34567, OUI Lookup, RTSP sdp templates |

---

## 🔄 Extensibility & Independent Updates

To add new manufacturers, OUI blocks, or RTSP URL templates in the future:
Simply edit the JSON files in `server/database/`. No application source code changes are required!
