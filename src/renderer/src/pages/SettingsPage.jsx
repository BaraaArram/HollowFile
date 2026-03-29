import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOffline } from '../contexts/offlineContextState';
import { useI18n } from '../contexts/i18nState';

export default function SettingsPage({ onBundleCollectionsChange }) {
  const { isOffline, setOffline } = useOffline();
  const { t, formatTime, formatNumber, formatBytes: formatLocalizedBytes } = useI18n();
  const [currentDir, setCurrentDir] = useState(null);
  const [libraryContext, setLibraryContext] = useState({ libraries: [], activeLibrary: null });
  const [removingLibraryId, setRemovingLibraryId] = useState(null);
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

  const applyLibraryContext = useCallback((context) => {
    if (!context) {
      return;
    }

    setLibraryContext(context);
    const activePath = context.activeLibrary?.path || null;
    setCurrentDir(activePath);
    setScanDisabled(!activePath);
    setStatus(activePath ? t('settingsPage.status.ready') : t('settingsPage.status.noDirectory'));
  }, [t]);

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
    if (window.api?.getLibraryContext) {
      window.api.getLibraryContext().then((context) => {
        applyLibraryContext(context);
      });
    }
    const savedApiKey = localStorage.getItem('tmdbApiKey');
    if (savedApiKey && window.api && window.api.setTmdbApiKey) {
      window.api.setTmdbApiKey(savedApiKey);
    }
    if (window.api && window.api.getAppInfo) {
      window.api.getAppInfo().then(info => setAppInfo(info));
    }

    const handler = (event) => applyLibraryContext(event.detail);
    window.addEventListener('library-context-changed', handler);
    return () => window.removeEventListener('library-context-changed', handler);
  }, [applyLibraryContext, t]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [scanLogs]);

  const handleSelectDir = () => {
    window.api.selectDirectory().then((dirPath) => {
      if (dirPath) {
        window.api.getLibraryContext?.().then((context) => {
          applyLibraryContext(context);
          window.dispatchEvent(new CustomEvent('library-context-changed', { detail: context }));
        });
      }
    });
  };

  const handleActivateLibrary = async (libraryId) => {
    const context = await window.api?.setActiveLibrary?.(libraryId);
    applyLibraryContext(context);
    window.dispatchEvent(new CustomEvent('library-context-changed', { detail: context }));
  };

  const handleRemoveLibrary = async (libraryId) => {
    if (removingLibraryId !== libraryId) {
      setRemovingLibraryId(libraryId);
      return;
    }

    setRemovingLibraryId(null);
    const context = await window.api?.removeLibrary?.(libraryId);
    applyLibraryContext(context);
    window.dispatchEvent(new CustomEvent('library-context-changed', { detail: context }));
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
    setStatus(t('settingsPage.status.scanning'));
    setScanLogs([]);
    scanInProgress.current = true;
    window.api.scanDirectoryStream(
      currentDir,
      (progress) => {
        if (progress.logs) setScanLogs(progress.logs);
        if (progress.status === 'scan-complete') setStatus(t('settingsPage.status.scanComplete'));
      },
      () => {
        setStatus(t('settingsPage.status.scanComplete'));
        scanInProgress.current = false;
        window.api?.getLibraryContext?.().then((context) => {
          applyLibraryContext(context);
          window.dispatchEvent(new CustomEvent('library-context-changed', { detail: context }));
        });
      },
      { downloadCastImages, autoDownloadTrailers, trailerQuality }
    );
  };

  const handleClearResults = async () => {
    if (!clearConfirm) { setClearConfirm(true); return; }
    setClearConfirm(false);
    if (window.api && window.api.clearScanResults) {
      const result = await window.api.clearScanResults();
      if (result.success) setStatus(t('settingsPage.status.cacheCleared', { count: formatNumber(result.count) }));
      else setStatus(t('settingsPage.status.cacheClearFailed'));
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

  useEffect(() => { loadStorageInfo(); }, [currentDir]);

  const formatBytes = (bytes) => {
    return formatLocalizedBytes(bytes);
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
        <h1 className="set-title">{t('settingsPage.title')}</h1>
        <p className="set-subtitle">{t('settingsPage.subtitle')}</p>
      </div>

      {/* API Configuration */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 className="set-section-title">{t('settingsPage.api.title')}</h2>
        </div>
        <div className="set-card">
          <label className="set-label" htmlFor="tmdbApiKey">{t('settingsPage.api.keyLabel')}</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              id="tmdbApiKey"
              value={tmdbApiKey}
              onChange={handleTmdbApiKeyChange}
              placeholder={t('settingsPage.api.keyPlaceholder')}
              className="set-input"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(v => !v)}
              className="set-eye-btn"
              title={showApiKey ? t('settingsPage.api.hideKey') : t('settingsPage.api.showKey')}
            >
              {showApiKey ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
              )}
            </button>
          </div>
          <p className="set-hint">
            {t('settingsPage.api.getKeyPrefix')} <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer">{t('settingsPage.api.tmdbSettings')}</a>
          </p>
        </div>
      </section>

      {/* Library */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 className="set-section-title">{t('settingsPage.library.title')}</h2>
        </div>
        <div className="set-card">
          <div className="set-library-toolbar">
            <div>
              <div className="set-library-kicker">{t('settingsPage.library.activeDisk')}</div>
              <div className="set-library-active-name">{libraryContext.activeLibrary?.name || t('settingsPage.library.noDiskSelected')}</div>
            </div>
            <button className="dp-btn dp-btn-ghost" onClick={handleSelectDir}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t('settingsPage.library.addDisk')}
            </button>
          </div>
          {libraryContext.activeLibrary?.path && (
            <div className="set-dir-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="var(--hk-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span className="set-dir-path">{libraryContext.activeLibrary.path}</span>
              <button className="set-dir-open" onClick={() => openInExplorer(libraryContext.activeLibrary.path)} title={t('settingsPage.common.openInExplorer')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          )}
          <div className="set-library-grid">
            {libraryContext.libraries.map((library) => {
              const isActive = library.id === libraryContext.activeLibrary?.id;
              return (
                <article key={library.id} className={`set-library-card${isActive ? ' active' : ''}`}>
                  <div className="set-library-card-head">
                    <div>
                      <h3 className="set-library-name" dir="auto">{library.name}</h3>
                      <p className="set-library-path" title={library.path}>{library.path}</p>
                    </div>
                    {isActive && <span className="set-library-badge">{t('settingsPage.library.activeBadge')}</span>}
                  </div>
                  <div className="set-library-meta">
                    <span>{library.lastScannedAt ? t('settingsPage.library.lastScannedAt', { time: formatTime(library.lastScannedAt) }) : t('settingsPage.library.notScannedYet')}</span>
                  </div>
                  <div className="set-library-actions">
                    <button className="dp-btn dp-btn-ghost" onClick={() => openInExplorer(library.path)}>
                      {t('settingsPage.common.openInExplorer')}
                    </button>
                    <button className="dp-btn dp-btn-ghost" onClick={() => handleActivateLibrary(library.id)} disabled={isActive}>
                      {isActive ? t('settingsPage.library.activeDisk') : t('settingsPage.library.switchToDisk')}
                    </button>
                    <button className={`dp-btn ${removingLibraryId === library.id ? 'dp-btn-danger' : 'dp-btn-ghost'}`} onClick={() => handleRemoveLibrary(library.id)}>
                      {removingLibraryId === library.id ? t('settingsPage.library.confirmRemoveDisk') : t('settingsPage.library.removeDisk')}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          {libraryContext.libraries.length === 0 && (
            <div className="set-library-empty">{t('settingsPage.library.emptyState')}</div>
          )}
          <div className="set-status-row">
            <span className={`set-status-dot ${scanInProgress.current ? 'scanning' : status === t('settingsPage.status.scanComplete') ? 'complete' : ''}`} />
            <span className="set-status">{status}</span>
          </div>
          {scanLogs.length > 0 && (
            <div className="set-logs">
              <div className="set-logs-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-5-6-5M12 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('settingsPage.library.scanLogs')}
              </div>
              <div className="set-logs-box">
                {scanLogs.slice(-30).map((log, idx) => (
                  <div key={idx} className="set-log-line">
                    <span className="set-log-time">{formatTime(log.timestamp)}</span>
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          )}
          <div className="set-btn-row">
            <button className="dp-btn dp-btn-play" onClick={handleScan} disabled={scanDisabled}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t('settingsPage.library.scanActiveDisk')}
            </button>
            <button
              className={`dp-btn ${clearConfirm ? 'dp-btn-danger' : 'dp-btn-ghost'}`}
              onClick={handleClearResults}
              title={clearConfirm ? t('settingsPage.library.clickAgainToConfirm') : t('settingsPage.library.clearCacheHint')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {clearConfirm ? t('settingsPage.library.confirmClear') : t('settingsPage.library.clearCache')}
            </button>
          </div>
        </div>
      </section>

      {/* Preferences */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z" stroke="var(--hk-accent)" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="var(--hk-accent)" strokeWidth="2"/></svg>
          <h2 className="set-section-title">{t('settingsPage.preferences.title')}</h2>
        </div>
        <div className="set-toggles">
          <label className="set-toggle">
            <input type="checkbox" checked={bundleCollections} onChange={handleBundleToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">{t('settingsPage.preferences.bundleCollections')}</span>
              <span className="set-toggle-desc">{t('settingsPage.preferences.bundleCollectionsDesc')}</span>
            </div>
          </label>
          <label className="set-toggle">
            <input type="checkbox" checked={downloadCastImages} onChange={handleDownloadCastImagesToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">{t('settingsPage.preferences.downloadCastImages')}</span>
              <span className="set-toggle-desc">{t('settingsPage.preferences.downloadCastImagesDesc')}</span>
            </div>
          </label>
          <label className="set-toggle">
            <input type="checkbox" checked={showTrailers} onChange={handleShowTrailersToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">{t('settingsPage.preferences.showTrailers')}</span>
              <span className="set-toggle-desc">{t('settingsPage.preferences.showTrailersDesc')}</span>
            </div>
          </label>
          <label className="set-toggle">
            <input type="checkbox" checked={autoDownloadTrailers} onChange={handleAutoDownloadTrailersToggle} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">{t('settingsPage.preferences.autoDownloadTrailers')}</span>
              <span className="set-toggle-desc">{t('settingsPage.preferences.autoDownloadTrailersDesc')}</span>
            </div>
          </label>
          {autoDownloadTrailers && (
            <div className="set-card" style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
              <label className="set-label">{t('settingsPage.preferences.trailerQuality')}</label>
              <select
                className="set-input"
                value={trailerQuality}
                onChange={handleTrailerQualityChange}
              >
                <option value="360">360p</option>
                <option value="480">480p</option>
                <option value="720">{t('settingsPage.preferences.recommended720')}</option>
                <option value="1080">1080p</option>
              </select>
              <p className="set-hint">{t('settingsPage.preferences.trailerQualityHint')}</p>
            </div>
          )}
        </div>
        <div className="set-card" style={{ marginTop: '0.75rem' }}>
          <label className="set-label">{t('settingsPage.preferences.peopleImagesLocation')}</label>
          <div className="set-btn-row">
            <button className="dp-btn dp-btn-ghost" onClick={handleSelectPeopleDir}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {t('settingsPage.preferences.selectFolder')}
            </button>
            {peopleDir && (
              <div className="set-dir-row" style={{ flex: 1 }}>
                <span className="set-dir-path">{peopleDir}</span>
                <button className="set-dir-open" onClick={() => openInExplorer(peopleDir)} title={t('settingsPage.common.openInExplorer')}>
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
          <h2 className="set-section-title">{t('settingsPage.network.title')}</h2>
        </div>
        <div className="set-toggles">
          <label className="set-toggle">
            <input type="checkbox" checked={isOffline} onChange={async (e) => {
              await setOffline(e.target.checked);
            }} />
            <span className="set-toggle-slider" />
            <div className="set-toggle-content">
              <span className="set-toggle-text">{t('settingsPage.network.offlineMode')}</span>
              <span className="set-toggle-desc">{t('settingsPage.network.offlineModeDesc')}</span>
            </div>
          </label>
        </div>
        {isOffline && (
          <div className="set-card" style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ color: '#ef4444', fontSize: '0.82rem', fontWeight: 600 }}>{t('settingsPage.network.offlineWarning')}</span>
          </div>
        )}
      </section>

      {/* Storage */}
      <section className="set-section">
        <div className="set-section-head">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <h2 className="set-section-title">{t('settingsPage.storage.title')}</h2>
          <button className="set-dir-open" onClick={loadStorageInfo} title={t('common.refresh')} style={{ marginLeft: 'auto' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {storageLoading && !storageInfo ? (
          <div className="set-card"><p className="set-hint">{t('settingsPage.storage.calculating')}</p></div>
        ) : storageInfo ? (
          <>
            <div className="set-card">
              <div className="set-storage-total">
                <span className="set-storage-total-label">{t('settingsPage.storage.totalUsed')}</span>
                <span className="set-storage-total-value">{formatBytes(storageInfo.total)}</span>
              </div>
              <div className="set-storage-sub-totals">
                <span className="set-hint">{t('settingsPage.storage.mediaFiles')}: {formatBytes(storageInfo.movieFiles.size)}</span>
                <span className="set-hint">{t('settingsPage.storage.downloadedData')}: {formatBytes(storageInfo.downloadedTotal)}</span>
                <span className="set-hint">{t('settingsPage.storage.cachedMetadata')}: {formatBytes(storageInfo.cachedData.size)}</span>
              </div>
              {storageInfo.total > 0 && (
                <div className="set-storage-bar">
                  {storageInfo.movieFiles.size > 0 && <div className="set-storage-seg set-seg-files" style={{ width: (storageInfo.movieFiles.size / storageInfo.total * 100) + '%' }} title={`${t('settingsPage.storage.mediaFiles')}: ${formatBytes(storageInfo.movieFiles.size)}`} />}
                  {storageInfo.posters.size > 0 && <div className="set-storage-seg set-seg-posters" style={{ width: (storageInfo.posters.size / storageInfo.total * 100) + '%' }} title={`${t('settingsPage.storage.posters')}: ${formatBytes(storageInfo.posters.size)}`} />}
                  {storageInfo.people.size > 0 && <div className="set-storage-seg set-seg-people" style={{ width: (storageInfo.people.size / storageInfo.total * 100) + '%' }} title={`${t('settingsPage.storage.castImages')}: ${formatBytes(storageInfo.people.size)}`} />}
                  {storageInfo.trailers.size > 0 && <div className="set-storage-seg set-seg-trailers" style={{ width: (storageInfo.trailers.size / storageInfo.total * 100) + '%' }} title={`${t('settingsPage.storage.trailers')}: ${formatBytes(storageInfo.trailers.size)}`} />}
                  {storageInfo.cachedData.size > 0 && <div className="set-storage-seg set-seg-cached" style={{ width: (storageInfo.cachedData.size / storageInfo.total * 100) + '%' }} title={`${t('settingsPage.storage.cachedData')}: ${formatBytes(storageInfo.cachedData.size)}`} />}
                </div>
              )}
              <div className="set-storage-legend">
                <span className="set-legend-item"><span className="set-legend-dot set-seg-files" /> {t('settingsPage.storage.mediaFiles')}</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-posters" /> {t('settingsPage.storage.posters')}</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-people" /> {t('settingsPage.storage.castImages')}</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-trailers" /> {t('settingsPage.storage.trailers')}</span>
                <span className="set-legend-item"><span className="set-legend-dot set-seg-cached" /> {t('settingsPage.storage.cachedData')}</span>
              </div>
            </div>
            <div className="set-storage-grid">
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-files" />
                  <span className="set-storage-cat-title">{t('settingsPage.storage.mediaFiles')}</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.movieFiles.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{t('settingsPage.storage.filesInLibrary', { count: formatNumber(storageInfo.movieFiles.count) })}</span>
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-posters" />
                  <span className="set-storage-cat-title">{t('settingsPage.storage.postersAndBackdrops')}</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.posters.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{t('settingsPage.storage.imagesCount', { count: formatNumber(storageInfo.posters.count) })}</span>
                {storageInfo.posters.size > 0 && (
                  <button className={`set-storage-clear ${clearingCategory === 'posters' ? 'set-storage-clear-confirm' : ''}`} onClick={() => handleClearCategory('posters')}>
                    {clearingCategory === 'posters' ? t('settingsPage.storage.confirmDelete') : t('common.clear')}
                  </button>
                )}
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-people" />
                  <span className="set-storage-cat-title">{t('settingsPage.storage.castImages')}</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.people.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{t('settingsPage.storage.castProfiles', { photos: formatNumber(storageInfo.people.imgCount), profiles: formatNumber(storageInfo.people.jsonCount) })}</span>
                {storageInfo.people.size > 0 && (
                  <button className={`set-storage-clear ${clearingCategory === 'people' ? 'set-storage-clear-confirm' : ''}`} onClick={() => handleClearCategory('people')}>
                    {clearingCategory === 'people' ? t('settingsPage.storage.confirmDelete') : t('common.clear')}
                  </button>
                )}
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-trailers" />
                  <span className="set-storage-cat-title">{t('settingsPage.storage.trailers')}</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.trailers.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{t('settingsPage.storage.downloadedCount', { count: formatNumber(storageInfo.trailers.count) })}</span>
                {storageInfo.trailers.size > 0 && (
                  <button className={`set-storage-clear ${clearingCategory === 'trailers' ? 'set-storage-clear-confirm' : ''}`} onClick={() => handleClearCategory('trailers')}>
                    {clearingCategory === 'trailers' ? t('settingsPage.storage.confirmDelete') : t('common.clear')}
                  </button>
                )}
              </div>
              <div className="set-storage-cat">
                <div className="set-storage-cat-head">
                  <span className="set-legend-dot set-seg-cached" />
                  <span className="set-storage-cat-title">{t('settingsPage.storage.cachedMetadata')}</span>
                  <span className="set-storage-cat-size">{formatBytes(storageInfo.cachedData.size)}</span>
                </div>
                <span className="set-storage-cat-detail">{t('settingsPage.storage.cachedItems', { movies: formatNumber(storageInfo.cachedData.movieCount), episodes: formatNumber(storageInfo.cachedData.tvCount) })}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="set-card"><p className="set-hint">{t('settingsPage.storage.loadFailed')}</p></div>
        )}
      </section>

      {/* About */}
      {appInfo && (
        <section className="set-section">
          <div className="set-section-head">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
            <h2 className="set-section-title">{t('settingsPage.about.title')}</h2>
          </div>
          <div className="set-card set-about">
            <div className="set-about-row">
              <span className="set-about-label">{t('settingsPage.about.version')}</span>
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
                {t('settingsPage.about.openConfig')}
              </button>
              <button className="set-path-btn" onClick={() => openInExplorer(appInfo.resultsDir)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('settingsPage.about.openResults')}
              </button>
              <button className="set-path-btn" onClick={() => openInExplorer(appInfo.logsDir)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 17l6-5-6-5M12 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t('settingsPage.about.openLogs')}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
} 