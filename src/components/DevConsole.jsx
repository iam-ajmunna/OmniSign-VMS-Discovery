import React from 'react';

export default function DevConsole({ logs, logFilter, setLogFilter, clearLogs, consoleBottomRef }) {
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'ALL') return true;
    return log.level === logFilter;
  });

  return (
    <footer className="dev-console-wrapper">
      <div className="console-header">
        <h3>Developer Terminal Logs</h3>
        <div className="console-controls">
          <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="console-select">
            <option value="ALL">ALL LOGS</option>
            <option value="INFO">INFO</option>
            <option value="DEBUG">DEBUG</option>
            <option value="WARN">WARN</option>
            <option value="ERROR">ERROR</option>
          </select>
          <button className="btn-clear" onClick={clearLogs}>Clear Logs</button>
        </div>
      </div>
      <div className="console-body">
        {filteredLogs.map((log, idx) => {
          const isCommand = log.message.startsWith('$ ') || log.message.startsWith('> ');
          const isOutput = log.message.startsWith('  ');
          let consoleTypeClass = '';
          if (isCommand) consoleTypeClass = 'is-command';
          else if (isOutput) consoleTypeClass = 'is-output';

          return (
            <div key={idx} className={`console-line level-${log.level.toLowerCase()} ${consoleTypeClass}`}>
              <span className="log-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              {!isCommand && !isOutput && <span className="log-level">[{log.level}]</span>}
              <span className="log-msg">{log.message}</span>
            </div>
          );
        })}
        <div ref={consoleBottomRef} />
      </div>
    </footer>
  );
}
