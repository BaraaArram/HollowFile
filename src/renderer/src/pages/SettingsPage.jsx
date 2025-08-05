import React, { useState, useEffect, useRef } from 'react';

export default function SettingsPage({ onBundleCollectionsChange }) {
  const [currentDir, setCurrentDir] = useState(null);
  const [status, setStatus] = useState('');
  const [scanDisabled, setScanDisabled] = useState(true);
  const [bundleCollections, setBundleCollections] = useState(() => {
    return localStorage.getItem('bundleCollections') === 'true';
  });
  const [downloadCastImages, setDownloadCastImages] = useState(localStorage.getItem('downloadCastImages') === 'true');
  const [showTrailers, setShowTrailers] = useState(localStorage.getItem('showTrailers') === 'true');
  const [peopleDir, setPeopleDir] = useState(localStorage.getItem('peopleDir') || '');
  const [tmdbApiKey, setTmdbApiKey] = useState(localStorage.getItem('tmdbApiKey') || '');
  const scanInProgress = useRef(false);

  useEffect(() => {
    if (window.api && window.api.getSavedDir) {
      window.api.getSavedDir().then((dir) => {
        setCurrentDir(dir);
        setScanDisabled(!dir);
        setStatus(dir ? `Directory: ${dir}` : 'No directory selected');
      });
    }
  }, []);

  const handleSelectDir = () => {
    window.api.selectDirectory().then((dirPath) => {
      if (dirPath) {
        setCurrentDir(dirPath);
        setScanDisabled(false);
        setStatus(`Directory: ${dirPath}`);
      }
    });
  };

  const handleSelectPeopleDir = () => {
    if (window.api && window.api.selectDirectory) {
      window.api.selectDirectory().then((dirPath) => {
        if (dirPath) {
          setPeopleDir(dirPath);
          localStorage.setItem('peopleDir', dirPath);
        }
      });
    }
  };

  const handleScan = () => {
    if (!currentDir || scanInProgress.current) return;
    setStatus(`Scanning: ${currentDir}`);
    scanInProgress.current = true;
    window.api.scanDirectoryStream(
      currentDir,
      null,
      () => {
        setStatus(`Scan complete: ${currentDir}`);
        scanInProgress.current = false;
      },
      { downloadCastImages } // Pass the option
    );
  };

  const handleBundleToggle = (e) => {
    setBundleCollections(e.target.checked);
    localStorage.setItem('bundleCollections', e.target.checked);
    if (onBundleCollectionsChange) onBundleCollectionsChange(e.target.checked);
  };

  const handleDownloadCastImagesToggle = (e) => {
    setDownloadCastImages(e.target.checked);
    localStorage.setItem('downloadCastImages', e.target.checked);
  };

  const handleShowTrailersToggle = (e) => {
    setShowTrailers(e.target.checked);
    localStorage.setItem('showTrailers', e.target.checked);
  };

  const handleTmdbApiKeyChange = (e) => {
    const newKey = e.target.value;
    setTmdbApiKey(newKey);
    localStorage.setItem('tmdbApiKey', newKey);
    if (window.api && window.api.setTmdbApiKey) {
      window.api.setTmdbApiKey(newKey);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2.2rem', marginTop: 0, fontSize: 32, fontWeight: 900, letterSpacing: 0.5 }}>Settings</h1>
      
      <div style={{ marginBottom: 32 }}>
        <div style={{ color: 'var(--hk-accent)', fontWeight: 800, fontSize: 20, marginBottom: 16 }}>API Configuration</div>
        <div style={{ background: '#232849cc', borderRadius: 10, padding: '1rem 1.2rem', marginBottom: 8 }}>
          <label htmlFor="tmdbApiKey" style={{ display: 'block', color: 'var(--hk-accent)', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
            TMDB API Key
          </label>
          <input
            type="password"
            id="tmdbApiKey"
            value={tmdbApiKey}
            onChange={handleTmdbApiKeyChange}
            placeholder="Enter your TMDB API key"
            style={{
              width: '100%',
              background: '#232849',
              border: '2px solid var(--hk-accent)',
              borderRadius: 8,
              padding: '0.7rem 1rem',
              color: '#fff',
              fontSize: 15
            }}
          />
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 14, marginTop: 8 }}>
            Get your API key from <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--hk-accent)' }}>TMDB Settings</a>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ color: 'var(--hk-accent)', fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Media Settings</div>
        <div style={{ maxWidth: 600, margin: '2rem auto', background: 'var(--hk-bg-alt)', borderRadius: '18px', boxShadow: '0 0 24px #23284955', padding: '2.5rem 2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div className="hk-navbar-status" style={{ margin: 0, background: '#232849cc', fontSize: 15, padding: '0.5rem 1rem', borderRadius: 10 }}>
              {status}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button onClick={handleSelectDir} className="hk-navbar-btn" style={{ fontSize: 16, padding: '0.6rem 1.5rem' }}>
              <span role="img" aria-label="folder" style={{ marginRight: 8 }}>📂</span>
              Select Directory
            </button>
            <button onClick={handleScan} className="hk-navbar-btn" style={{ fontSize: 16, padding: '0.6rem 1.5rem' }} disabled={scanDisabled}>
              <span role="img" aria-label="scan" style={{ marginRight: 8 }}>🔍</span>
              Scan
            </button>
          </div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 13, marginTop: 8, marginBottom: 24 }}>
            The selected directory will be used for scanning and media management.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#232849cc', borderRadius: 10, padding: '0.7rem 1.2rem', marginBottom: 8 }}>
            <input
              type="checkbox"
              id="bundleCollections"
              checked={bundleCollections}
              onChange={handleBundleToggle}
              style={{ accentColor: 'var(--hk-accent)', width: 18, height: 18, marginRight: 10 }}
            />
            <label htmlFor="bundleCollections" style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Bundle collections together in the UI
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#232849cc', borderRadius: 10, padding: '0.7rem 1.2rem', marginBottom: 8 }}>
            <input
              type="checkbox"
              id="downloadCastImages"
              checked={downloadCastImages}
              onChange={handleDownloadCastImagesToggle}
              style={{ accentColor: 'var(--hk-accent)', width: 18, height: 18, marginRight: 10 }}
            />
            <label htmlFor="downloadCastImages" style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Download cast/crew images
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#232849cc', borderRadius: 10, padding: '0.7rem 1.2rem', marginBottom: 8 }}>
            <input
              type="checkbox"
              id="showTrailers"
              checked={showTrailers}
              onChange={handleShowTrailersToggle}
              style={{ accentColor: 'var(--hk-accent)', width: 18, height: 18, marginRight: 10 }}
            />
            <label htmlFor="showTrailers" style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
              Show trailers in detail page
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#232849cc', borderRadius: 10, padding: '0.7rem 1.2rem', marginBottom: 8 }}>
            <button onClick={handleSelectPeopleDir} className="hk-navbar-btn" style={{ fontSize: 15, padding: '0.4rem 1.2rem' }}>
              Select People Images Location
            </button>
            <span style={{ color: 'var(--hk-text-muted)', fontSize: 14, marginLeft: 8 }}>{peopleDir}</span>
          </div>
        </div>
      </div>
    </div>
  );
} 