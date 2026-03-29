import React, { useState, useEffect, useRef } from 'react';
import { useOffline } from '../contexts/offlineContextState';

export default function SettingsPage({ onBundleCollectionsChange }) {
  const { isOffline, setOffline } = useOffline();
  const [currentDir, setCurrentDir] = useState(null);
  const [status, setStatus] = useState('');
  const [scanDisabled, setScanDisabled] = useState(true);
  const [bundleCollections, setBundleCollections] = useState(false);
  const [downloadCastImages, setDownloadCastImages] = useState(false);
  const [showTrailers, setShowTrailers] = useState(false);
  const [autoDownloadTrailers, setAutoDownloadTrailers] = useState(false);
  const [trailerQuality, setTrailerQuality] = useState('720');
  const [peopleDir, setPeopleDir] = useState('');
  const [tmdbApiKey, setTmdbApiKey] = useState('');
  const [scanLogs, setScanLogs] = useState([]);
  const [appInfo, setAppInfo] = useState(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);
  const [clearingCategory, setClearingCategory] = useState(null);
  const scanInProgress = useRef(false);
  const logsEndRef = useRef(null);

  // Helper: save a setting to both config.json (persists across restarts) and localStorage (for cross-page reads)
  const saveSetting = (key, value) => {
    localStorage.setItem(key, String(value));
    if (window.api?.saveSettings) window.api.saveSettings({ [key]: value });
  };

  useEffect(() => {
    // Load persisted settings from main process config.json
    const loadSettings = async () => {
      if (window.api?.getSettings) {
        const saved = await window.api.getSettings();
        if (saved.bundleCollections != null) { setBundleCollections(saved.bundleCollections); localStorage.setItem('bundleCollections', String(saved.bundleCollections)); }
        if (saved.downloadCastImages != null) { setDownloadCastImages(saved.downloadCastImages); localStorage.setItem('downloadCastImages', String(saved.downloadCastImages)); }
        if (saved.showTrailers != null) { setShowTrailers(saved.showTrailers); localStorage.setItem('showTrailers', String(saved.showTrailers)); }
        if (saved.autoDownloadTrailers != null) { setAutoDownloadTrailers(saved.autoDownloadTrailers); localStorage.setItem('autoDownloadTrailers', String(saved.autoDownloadTrailers)); }
        if (saved.trailerQuality != null) { setTrailerQuality(saved.trailerQuality); localStorage.setItem('trailerQuality', saved.trailerQuality); }
        if (saved.peopleDir != null) { setPeopleDir(saved.peopleDir); localStorage.setItem('peopleDir', saved.peopleDir); }
        if (saved.tmdbApiKey != null) { setTmdbApiKey(saved.tmdbApiKey); localStorage.setItem('tmdbApiKey', saved.tmdbApiKey); }
      }
    };
    loadSettings();
    if (window.api && window.api.getSavedDir) {
      window.api.getSavedDir().then((dir) => {
        setCurrentDir(dir);
        setScanDisabled(!dir);
        setStatus(dir ? 'Ready' : 'No directory selected');
      });
    }
    const savedApiKey = localStorage.getItem('tmdbApiKey');
    if (savedApiKey && window.api && window.api.setTmdbApiKey) {
      window.api.setTmdbApiKey(savedApiKey);
    }
    if (window.api && window.api.getAppInfo) {
      window.api.getAppInfo().then(info => setAppInfo(info));
    }
  }, []);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [scanLogs]);

  const handleSelectDir = () => {
    window.api.selectDirectory().then((dirPath) => {
      if (dirPath) { setCurrentDir(dirPath); setScanDisabled(false); setStatus('Ready'); }
    });
  };

  const handleSelectPeopleDir = () => {
    if (window.api && window.api.selectDirectory) {
      window.api.selectDirectory().then((dirPath) => {
        if (dirPath) { setPeopleDir(dirPath); saveSetting('peopleDir', dirPath); }
      });
    }
  };

  const handleScan = () => {
    if (!currentDir || scanInProgress.current) return;
    setStatus('Scanning...');
    setScanLogs([]);
    scanInProgress.current = true;
    window.api.scanDirectoryStream(
      currentDir,
      (progress) => {
        if (progress.logs) setScanLogs(progress.logs);
        if (progress.status === 'scan-complete') setStatus('Scan complete');
      },
      () => { setStatus('Scan complete'); scanInProgress.current = false; },
      { downloadCastImages, autoDownloadTrailers, trailerQuality }
    );
  };

  const handleClearResults = async () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    setClearConfirm(false);
    if (window.api && window.api.clearScanResults) {
      const result = await window.api.clearScanResults();
      if (result.success) setStatus(`Cleared ${result.count} cached results`);
      else setStatus('Failed to clear results');
    }
  };

  const handleBundleToggle = (e) => {
    setBundleCollections(e.target.checked);
    saveSetting('bundleCollections', e.target.checked);
    if (onBundleCollectionsChange) onBundleCollectionsChange(e.target.checked);
  };

  const handleDownloadCastImagesToggle = (e) => {
    setDownloadCastImages(e.target.checked);
    saveSetting('downloadCastImages', e.target.checked);
  };

  const handleShowTrailersToggle = (e) => {
    setShowTrailers(e.target.checked);
    saveSetting('showTrailers', e.target.checked);
  };

  const handleAutoDownloadTrailersToggle = (e) => {
    setAutoDownloadTrailers(e.target.checked);
    saveSetting('autoDownloadTrailers', e.target.checked);
  };

  const handleTrailerQualityChange = (e) => {
    setTrailerQuality(e.target.value);
    saveSetting('trailerQuality', e.target.value);
  };

  const handleTmdbApiKeyChange = (e) => {
    const newKey = e.target.value;
    setTmdbApiKey(newKey);
    saveSetting('tmdbApiKey', newKey);
    if (window.api && window.api.setTmdbApiKey) window.api.setTmdbApiKey(newKey);
  };

  const openInExplorer = (targetPath) => {
    if (window.api && window.api.openPathInExplorer) window.api.openPathInExplorer(targetPath);
  };

  const loadStorageInfo = async () => {
    setStorageLoading(true);
    try {
      const info = await window.api.getStorageInfo();
      if (info.success) setStorageInfo(info);
    } catch (e) { console.error('Failed to load storage info', e); }
    setStorageLoading(false);
  };

  useEffect(() => { loadStorageInfo(); }, []);

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
  };

  const handleClearCategory = async (category) => {
    if (clearingCategory !== category) { setClearingCategory(category); return; }
    setClearingCategory(null);
    const apiMap = { trailers: 'clearTrailers', people: 'clearPeopleData', posters: 'clearPosters' };
    const fn = apiMap[category];
    if (fn && window.api[fn]) {
      await window.api[fn]();
      loadStorageInfo();
    }
  };

  return (
    <div className="set">
      <div className="set-header">
        <h1 className="set-title">Settings</h1>
        <p className="set-subtitle">Configure your media library</p>
      </div>

      {/* API Configuration */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 className="set-section-title">API Configuration</h2>
        </div>
        <div className="set-card">
          <label className="set-label" htmlFor="tmdbApiKey">TMDB API Key</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              id="tmdbApiKey"
              value={tmdbApiKey}
              onChange={handleTmdbApiKeyChange}
              placeholder="Enter your TMDB API key"
              className="set-input"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(v => !v)}
              className="set-eye-btn"
              title={showApiKey ? 'Hide key' : 'Show key'}
            >
              {showApiKey ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
              )}
            </button>
          </div>
          <p className="set-hint">
            Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">TMDB Settings</a>
          </p>
        </div>
      </section>

      {/* Library */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 className="set-section-title">Library</h2>
        </div>
        <div className="set-card">
          {currentDir && (
            <div className="set-dir-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="var(--hk-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="set-dir-path">{currentDir}</span>
              <button className="set-dir-open" onClick={() => openInExplorer(currentDir)} title="Open in Explorer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}
          <div className="set-status-row">
            <span className={`set-status-dot ${scanInProgress.current ? 'scanning' : status === 'Scan complete' ? 'complete' : ''}`} />
            <span className="set-status">{status}</span>
          </div>
          {scanLogs.length > 0 && (
            <div className="set-logs">
              <div className="set-logs-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-5-6-5M12 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Scan Logs
              </div>
              <div className="set-logs-box">
                {scanLogs.slice(-30).map((log, idx) => (
                  <div key={idx} className="set-log-line">
                    <span className="set-log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
          <div className="set-btn-row">
            <button className="dp-btn dp-btn-ghost" onClick={handleSelectDir}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Select Directory
            </button>
            <button className="dp-btn dp-btn-play" onClick={handleScan} disabled={scanDisabled}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Scan Library
            </button>
            <button
              className={`dp-btn ${clearConfirm ? 'dp-btn-danger' : 'dp-btn-ghost'}`}
              onClick={handleClearResults}
              title={clearConfirm ? 'Click again to confirm' : 'Clear cached scan results'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {clearConfirm ? 'Confirm Clear' : 'Clear Cache'}
            </button>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" stroke="var(--hk-accent)" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="var(--hk-accent)" strokeWidth="2"/></svg>
          <h2 className="set-section-title">Preferences</h2>
        </div>
        <div className="set-toggles">
          <label className="set-toggle">
            <input type="checkbox" checked={bundleCollections} onChange={handleBundleToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">Bundle Collections</span>
              <span className="set-toggle-desc">Group movies by collection in the library</span>
            </div>
          </label>
          <label className="set-toggle">
            <input type="checkbox" checked={downloadCastImages} onChange={handleDownloadCastImagesToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">Download Cast Images</span>
              <span className="set-toggle-desc">Save cast and crew photos during scan</span>
            </div>
          </label>
          <label className="set-toggle">
            <input type="checkbox" checked={showTrailers} onChange={handleShowTrailersToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">Show Trailers</span>
              <span className="set-toggle-desc">Display trailers on detail pages</span>
            </div>
          </label>
          <label className="set-toggle">
            <input type="checkbox" checked={autoDownloadTrailers} onChange={handleAutoDownloadTrailersToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">Auto-Download Trailers</span>
              <span className="set-toggle-desc">Download the best trailer for each title after scan completes</span>
            </div>
          </label>
          {autoDownloadTrailers && (
            <div className="set-card" style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
              <label className="set-label">Trailer Quality</label>
              <select
                className="set-input"
                value={trailerQuality}
                onChange={handleTrailerQualityChange}
              >
                <option value="360">360p</option>
                <option value="480">480p</option>
                <option value="720">720p (Recommended)</option>
                <option value="1080">1080p</option>
              </select>
              <p className="set-hint">Maximum resolution for downloaded trailers</p>
            </div>
          )}
        </div>
        <div className="set-card" style={{ marginTop: '0.75rem' }}>
          <label className="set-label">People Images Location</label>
          <div className="set-btn-row">
            <button className="dp-btn dp-btn-ghost" onClick={handleSelectPeopleDir}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Select Folder
            </button>
            {peopleDir && (
              <div className="set-dir-row" style={{ flex: 1 }}>
                <span className="set-dir-path">{peopleDir}</span>
                <button className="set-dir-open" onClick={() => openInExplorer(peopleDir)} title="Open in Explorer">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Developer / Network */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M1 9l3-3 3 3M7 3l3 3 3-3M13 9l3-3 3 3M19 3l3 3" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 9v4a7 7 0 0014 0V9" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="18" r="1" fill="var(--hk-accent)"/></svg>
          <h2 className="set-section-title">Network</h2>
        </div>
        <div className="set-toggles">
          <label className="set-toggle">
            <input type="checkbox" checked={isOffline} onChange={async (e) => {
              await setOffline(e.target.checked);
            }} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">Offline Mode</span>
              <span className="set-toggle-desc">Disable all network requests to test the app offline</span>
            </div>
          </label>
        </div>
        {isOffline && (
          <div className="set-card" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>Network disabled — TMDB lookups, image fetches, and trailer downloads will fail</span>
          </div>
        )}
      </section>

      {/* Storage */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 className="set-section-title">Storage</h2>
          <button className="set-dir-open" onClick={loadStorageInfo} title="Refresh" style={{ marginLeft: 'auto' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {storageLoading && !storageInfo ? (
          <div className="set-card"><p className="set-hint">Calculating storage usage...</p></div>
        ) : storageInfo ? (
          <>
            <div className="set-card">
              <div className="set-storage-total">
                <span className="set-storage-total-label">Total Storage Used</span>
                <span className="set-storage-total-value">{formatBytes(storageInfo.total)}</span>
              </div>
              <div className="set-storage-sub-totals">
                <span className="set-hint">Media files: {formatBytes(storageInfo.movieFiles.size)}</span>
                <span className="set-hint">Downloaded data: {formatBytes(storageInfo.downloadedTotal)}</span>
                <span className="set-hint">Cached metadata: {formatBytes(storageInfo.cachedData.size)}</span>
              </div>
              {storageInfo.total > 0 && (
                <div className="set-storage-bar">
                  {storageInfo.movieFiles.size > 0 && <div className="set-storage-seg set-seg-files" style={{ width: (storageInfo.movieFiles.size / storageInfo.total * 100) + '%' }} title={`Media Files: ${formatBytes(storageInfo.movieFiles.size)}`} />}
                  {storageInfo.posters.size > 0 && <div className="set-storage-seg set-seg-posters" style={{ width: (storageInfo.posters.size / storageInfo.total * 100) + '%' }} title={`Posters: ${formatBytes(storageInfo.posters.size)}`} />}
                  {storageInfo.people.size > 0 && <div className="set-storage-seg set-seg-people" style={{ width: (storageInfo.people.size / storageInfo.total * 100) + '%' }} title={`Cast Images: ${formatBytes(storageInfo.people.size)}`} />}
                  {storageInfo.trailers.size > 0 && <div className="set-storage-seg set-seg-trailers" style={{ width: (storageInfo.trailers.size / storageInfo.total * 100) + '%' }} title={`Trailers: ${formatBytes(storageInfo.trailers.size)}`} />}
                  {storageInfo.cachedData.size > 0 && <div className="set-storage-seg set-seg-cached" style={{ width: (storageInfo.cachedData.size / storageInfo.total * 100) + '%' }} title={`Cached Data: ${formatBytes(storageInfo.cachedData.size)}`} />}
                </div>
              )}
              <div className="set-storage-legend">
                <span className="set-legend-item"><span className="set-legend-dot set-seg-files" /> Media Files</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-posters" /> Posters</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-people" /> Cast Images</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-trailers" /> Trailers</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-cached" /> Cached Data</span>
              </div>
            </div>
            <div className="set-storage-grid">
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-files" />
                  <span className="set-storage-cat-title">Media Files</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.movieFiles.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{storageInfo.movieFiles.count} files in library</span>
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-posters" />
                  <span className="set-storage-cat-title">Posters &amp; Backdrops</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.posters.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{storageInfo.posters.count} images</span>
                {storageInfo.posters.size > 0 && (
                  <button className={`set-storage-clear ${clearingCategory === 'posters' ? 'set-storage-clear-confirm' : ''}`} onClick={() => handleClearCategory('posters')}>
                    {clearingCategory === 'posters' ? 'Confirm Delete' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-people" />
                  <span className="set-storage-cat-title">Cast Images</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.people.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{storageInfo.people.imgCount} photos, {storageInfo.people.jsonCount} profiles</span>
                {storageInfo.people.size > 0 && (
                  <button className={`set-storage-clear ${clearingCategory === 'people' ? 'set-storage-clear-confirm' : ''}`} onClick={() => handleClearCategory('people')}>
                    {clearingCategory === 'people' ? 'Confirm Delete' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-trailers" />
                  <span className="set-storage-cat-title">Trailers</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.trailers.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{storageInfo.trailers.count} downloaded</span>
                {storageInfo.trailers.size > 0 && (
                  <button className={`set-storage-clear ${clearingCategory === 'trailers' ? 'set-storage-clear-confirm' : ''}`} onClick={() => handleClearCategory('trailers')}>
                    {clearingCategory === 'trailers' ? 'Confirm Delete' : 'Clear'}
                  </button>
                )}
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-cached" />
                  <span className="set-storage-cat-title">Cached Metadata</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.cachedData.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{storageInfo.cachedData.movieCount} movies, {storageInfo.cachedData.tvCount} episodes</span>
              </div>
            </div>
          </>
        ) : (
          <div className="set-card"><p className="set-hint">Failed to load storage info</p></div>
        )}
      </section>

      {/* About */}
      {appInfo && (
        <section className="set-section">
          <div className="set-section-head">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
            <h2 className="set-section-title">About</h2>
          </div>
          <div className="set-card set-about">
            <div className="set-about-row">
              <span className="set-about-label">Version</span>
              <span className="set-about-value">{appInfo.version || '1.0.0'}</span>
            </div>
            <div className="set-about-row">
              <span className="set-about-label">Electron</span>
              <span className="set-about-value">{appInfo.electron}</span>
            </div>
            <div className="set-about-row">
              <span className="set-about-label">Node.js</span>
              <span className="set-about-value">{appInfo.node}</span>
            </div>
            <div className="set-about-row">
              <span className="set-about-label">Chromium</span>
              <span className="set-about-value">{appInfo.chrome}</span>
            </div>
            <div className="set-about-paths">
              <button className="set-path-btn" onClick={() => openInExplorer(appInfo.configPath)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Open Config
              </button>
              <button className="set-path-btn" onClick={() => openInExplorer(appInfo.resultsDir)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Open Results
              </button>
              <button className="set-path-btn" onClick={() => openInExplorer(appInfo.logsDir)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-5-6-5M12 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Open Logs
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
} 