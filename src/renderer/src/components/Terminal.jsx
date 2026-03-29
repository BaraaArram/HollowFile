import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../contexts/i18nState';

const Terminal = ({ logs, isVisible, onToggle, title = "Terminal" }) => {
  const { t, formatTime } = useI18n();
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
          {title === 'Terminal' ? t('terminal.title') : title}
        </span>
        <div className="terminal-controls">
          <button
            className="terminal-btn"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? t('common.restore') : t('common.minimize')}
          >
            {isMinimized ? '□' : '−'}
          </button>
          <button
            className="terminal-btn"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? t('common.restore') : t('common.maximize')}
          >
            {isMaximized ? '❐' : '⬜'}
          </button>
          <button
            className="terminal-btn close"
            onClick={onToggle}
            title={t('common.close')}
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
                  {formatTime(log.timestamp)}
                </span>
                <span>{log.message}</span>
              </div>
            ))
          ) : (
            <div className="terminal-empty">
              {t('terminal.empty')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Terminal;