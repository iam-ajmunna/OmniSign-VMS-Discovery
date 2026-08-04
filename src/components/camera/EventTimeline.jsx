import React, { useRef, useEffect } from 'react';

const SEVERITY_CONFIG = {
  info:    { cls: 'evt-info',    icon: 'ℹ' },
  success: { cls: 'evt-success', icon: '✔' },
  warning: { cls: 'evt-warning', icon: '⚠' },
  error:   { cls: 'evt-error',   icon: '✖' },
};

/**
 * Chronological event timeline for the Camera Workspace.
 * Receives live events from useCameraHealth hook (Milestone 2+).
 * Shell in Milestone 1 with static placeholder events.
 */
export default function EventTimeline({ events = [] }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    const container = bodyRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [events.length]);

  const displayEvents = events.length > 0 ? events : [
    {
      id: 'placeholder',
      type: 'info',
      severity: 'info',
      message: 'Awaiting monitoring start. Health checks will log here.',
      timestamp: new Date().toISOString()
    }
  ];

  return (
    <div className="ws-module ws-module-timeline ws-module-stretch">
      <div className="ws-module-header">
        <h3>📋 Event Timeline</h3>
        <span className="evt-count">{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>
      <div ref={bodyRef} className="ws-module-body timeline-body">
        {displayEvents.map((evt) => {
          const { cls, icon } = SEVERITY_CONFIG[evt.severity] ?? SEVERITY_CONFIG.info;
          const time = new Date(evt.timestamp).toLocaleTimeString();
          return (
            <div key={evt.id || evt.timestamp} className={`timeline-event ${cls}`}>
              <span className="evt-icon">{icon}</span>
              <div className="evt-content">
                <span className="evt-message">{evt.message}</span>
                <span className="evt-time">{time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
