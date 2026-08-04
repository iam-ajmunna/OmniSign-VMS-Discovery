/**
 * Client-side utility for exporting discovered network devices to CSV or JSON files.
 */

export function exportToCsv(devices, filename = 'omnisight_camera_inventory.csv') {
  if (!devices || !devices.length) return;

  const headers = ['IP Address', 'MAC Address', 'Vendor', 'Model', 'Hostname', 'Confidence', 'Is Camera', 'Discovery Methods', 'Open Ports'];
  
  const rows = devices.map(d => [
    `"${d.ip || ''}"`,
    `"${d.mac || ''}"`,
    `"${d.vendor || ''}"`,
    `"${d.model || ''}"`,
    `"${d.hostname || ''}"`,
    `"${d.confidence || 0}%"`,
    `"${d.isCamera ? 'Yes' : 'No'}"`,
    `"${(d.discoveryMethods || []).join(', ')}"`,
    `"${(d.openPorts || []).map(p => p.port).join(', ')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJson(devices, filename = 'omnisight_camera_inventory.json') {
  if (!devices || !devices.length) return;

  const jsonString = JSON.stringify(devices, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
