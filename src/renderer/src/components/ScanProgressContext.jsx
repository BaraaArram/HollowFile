import React, { createContext, useState, useEffect } from 'react';

const ScanProgressContext = createContext();

export function ScanProgressProvider({ children }) {
  const [scanProgress, setScanProgress] = useState(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (window.api && window.api.onScanProgress) {
      const unsubscribe = window.api.onScanProgress((progress) => {
        console.log('Global scan progress:', progress);
        setScanProgress(progress);
        if (progress.status === 'scan-complete' || progress.status === 'done' || progress.status === 'error') {
          setIsScanning(false);
        } else {
          setIsScanning(true);
        }
      });
      return unsubscribe;
    }
  }, []);

  return (
    <ScanProgressContext.Provider value={{ scanProgress, isScanning, setScanProgress, setIsScanning }}>
      {children}
    </ScanProgressContext.Provider>
  );
}

