import React, { useState, useRef, useEffect } from 'react';

const Terminal = ({ logs, isVisible, onToggle, title = "Terminal" }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const terminalRef = useRef(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isVisible) return null;

  const getLogClass = (message) => {
    if (message.includes('Error') || message.includes('Failed') || message.includes('error')) {
      return 'terminal-log error';
    }
    if (message.includes('Success') || message.includes('Successfully') || message.includes('success')) {
      return 'terminal-log success';
    }
    if (message.includes('Warning') || message.includes('warning')) {
      return 'terminal-log warning';
    }
    return 'terminal-log info';
  };

  return (
    <div className={`terminal ${isMaximized ? 'maximized' : ''} ${isMinimized ? 'minimized' : ''}`}>
      <div className="terminal-header">
        <span className="terminal-title">
          {title}
        </span>
        <div className="terminal-controls">
          <button
            className="terminal-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? '□' : '−'}
          </button>
          <button
            className="terminal-btn"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore" : "Maximize"}
          >
            {isMaximized ? '❐' : '⬜'}
          </button>
          <button
            className="terminal-btn close"
            onClick={onToggle}
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div className="terminal-content" ref={terminalRef}>
          {logs && logs.length > 0 ? (
            logs.slice(-50).map((log, idx) => (
              <div key={idx} className={getLogClass(log.message)}>
                <span className="terminal-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span>{log.message}</span>
              </div>
            ))
          ) : (
            <div className="terminal-empty">
              No logs available. Start a scan to see activity here.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Terminal;