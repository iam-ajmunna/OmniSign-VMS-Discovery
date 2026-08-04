import React from 'react';

/**
 * Image Health Module — Architecture-ready shell.
 * Computer vision analysis capabilities will be plugged into this module.
 * Each capability slot is independently injectable.
 */
const IMAGE_CHECKS = [
  { id: 'frozen',     label: '❄️  Frozen Frame Detection',     description: 'Detects static/frozen video feed' },
  { id: 'blur',       label: '🔵 Blur Detection',              description: 'Detects lens fouling or focus issues' },
  { id: 'blackout',   label: '⬛ Black Screen Detection',      description: 'Detects complete signal loss' },
  { id: 'whiteout',   label: '⬜ White Screen Detection',       description: 'Detects overexposure or lens flare' },
  { id: 'obstruct',   label: '🚫 Lens Obstruction Detection',   description: 'Detects physical blockage' },
  { id: 'exposure',   label: '☀️  Exposure Analysis',           description: 'Detects over/underexposure' },
];

export default function ImageHealth({ health }) {
  const checks = health?.imageChecks;

  return (
    <div className="ws-module">
      <div className="ws-module-header">
        <h3>🖼 Image Health</h3>
        <span className={`module-status-chip ${checks ? 'chip-success' : 'chip-pending'}`}>
          {checks ? 'Analysis Active' : 'Analysis Offline'}
        </span>
      </div>
      <div className="ws-module-body">
        <div className="image-checks-grid">
          {IMAGE_CHECKS.map(check => {
            const result = checks?.[check.id];
            return (
              <div key={check.id} className="image-check-row">
                <div className="image-check-info">
                  <span className="image-check-label">{check.label}</span>
                  <span className="image-check-desc">{check.description}</span>
                </div>
                <span className={`image-check-status ${result ? (result.passed ? 'check-pass' : 'check-fail') : 'check-pending'}`}>
                  {result ? (result.passed ? '✔ Pass' : '✖ Alert') : 'Pending'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
