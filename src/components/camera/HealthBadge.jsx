import React from 'react';

/**
 * Reusable status indicator badge.
 * @param {'online'|'degraded'|'offline'|'unknown'|'pending'} status
 * @param {string} [label] - Override display text
 */
export default function HealthBadge({ status = 'unknown', label }) {
  const config = {
    online:   { text: 'Online',   cls: 'badge-online'   },
    degraded: { text: 'Degraded', cls: 'badge-degraded' },
    offline:  { text: 'Offline',  cls: 'badge-offline'  },
    pending:  { text: 'Checking', cls: 'badge-pending'  },
    unknown:  { text: 'Unknown',  cls: 'badge-unknown'  },
  };
  const { text, cls } = config[status] ?? config.unknown;
  return (
    <span className={`health-badge ${cls}`}>
      <span className="badge-dot" />
      {label ?? text}
    </span>
  );
}
