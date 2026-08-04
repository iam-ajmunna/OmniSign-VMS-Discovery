import { useEffect, useRef } from 'react';

/**
 * Reusable hook that manages a shared SSE connection lifecycle.
 * Opens the stream, registers named event listeners, and closes cleanly on unmount.
 *
 * @param {string} url - SSE endpoint URL
 * @param {Record<string, (data: any) => void>} handlers - Map of eventName → handler
 * @param {boolean} [enabled=true] - Set false to suppress the connection
 */
export function useEventSource(url, handlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers; // Always reflect latest handlers without reconnecting

  useEffect(() => {
    if (!enabled || !url) return;

    const es = new EventSource(url);

    const wrappedHandlers = {};
    for (const [event, fn] of Object.entries(handlersRef.current)) {
      wrappedHandlers[event] = (e) => {
        try {
          const data = JSON.parse(e.data);
          fn(data);
        } catch (err) {
          console.error(`[useEventSource] Failed to parse '${event}' event:`, err);
        }
      };
      es.addEventListener(event, wrappedHandlers[event]);
    }

    es.onerror = () => {
      console.warn('[useEventSource] SSE connection error — browser will reconnect.');
    };

    return () => {
      for (const [event, fn] of Object.entries(wrappedHandlers)) {
        es.removeEventListener(event, fn);
      }
      es.close();
    };
  }, [url, enabled]);
}
