import React, { useState, useEffect, useCallback } from 'react';
import { OfflineContext } from './offlineContextState';

export function OfflineProvider({ children }) {
  const [isOffline, setIsOffline] = useState(false);

  // Load persisted offline status on mount
  useEffect(() => {
    if (window.api?.getNetworkStatus) {
      window.api.getNetworkStatus().then(res => {
        if (res?.offline) setIsOffline(true);
      });
    }
  }, []);

  // Toggle body class for CSS hooks
  useEffect(() => {
    document.body.classList.toggle('is-offline', isOffline);
  }, [isOffline]);

  const setOffline = useCallback(async (offline) => {
    if (window.api?.setNetworkMode) {
      const res = await window.api.setNetworkMode(offline);
      if (res?.success) {
        setIsOffline(offline);
        return true;
      }
    }
    return false;
  }, []);

  return (
    <OfflineContext.Provider value={{ isOffline, setOffline }}>
      {children}
    </OfflineContext.Provider>
  );
}

