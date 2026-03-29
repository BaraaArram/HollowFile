import React, { useEffect, useState } from 'react';
import './App.css';
import './style.css';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ScanProgress from './components/ScanProgress';
import { OfflineProvider } from './contexts/OfflineContext';
import { useOffline } from './contexts/offlineContextState';
import { useI18n } from './contexts/i18nState';
const MoviesPage = React.lazy(() => import('./pages/MoviesPage'));
const ShowsPage = React.lazy(() => import('./pages/ShowsPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const UnmatchedPage = React.lazy(() => import('./pages/UnmatchedPage'));
const DetailPage = React.lazy(() => import('./pages/DetailPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ShowDetailPage = React.lazy(() => import('./pages/ShowDetailPage'));
const EpisodeDetailPage = React.lazy(() => import('./pages/EpisodeDetailPage'));
const StoragePage = React.lazy(() => import('./pages/StoragePage'));

function OfflineBanner() {
  const { isOffline, setOffline } = useOffline();
  const { t } = useI18n();
  if (!isOffline) return null;
  return (
    <div className="offline-banner">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      <span>{t('common.offline')}</span>
      <button className="offline-banner-btn" onClick={() => setOffline(false)}>{t('common.goOnline')}</button>
    </div>
  );
}

function App() {
  const { t } = useI18n();
  const [scanStatus, setScanStatus] = useState(null);
  const [, setScanErrors] = useState([]);
  const [, setIsScanning] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const [trailerProgress, setTrailerProgress] = useState(null);

  useEffect(() => {
    console.log('=== APP STARTUP DEBUG ===');
    console.log('App useEffect - checking window.api:', !!window.api);
    console.log('App useEffect - checking window.api.onScanProgress:', !!window.api?.onScanProgress);
    console.log('window.api object:', window.api);
    
    // Test IPC communication
    if (window.api && window.api.getSavedDir) {
      console.log('Testing IPC communication...');
      window.api.getSavedDir().then(result => {
        console.log('IPC test result:', result);
      }).catch(err => {
        console.error('IPC test failed:', err);
      });
    }
    
    let unsubProgress, unsubComplete, unsubTrailer, unsubTrailerBatch, unsubLibrary;

    if (window.api && window.api.onScanProgress) {
      console.log('Setting up scan progress listener...');
      unsubProgress = window.api.onScanProgress((progress) => {
        console.log('Received scan progress:', progress);
        setScanStatus(progress);
        if (progress.error) {
          setScanErrors(prev => [...prev, { file: progress.filename, error: progress.error }]);
        }
      });

      // Definitive end signal — clears the bar no matter what
      if (window.api.onScanComplete) {
        unsubComplete = window.api.onScanComplete(() => {
          console.log('Received scan-complete channel event — clearing scan bar');
          setScanStatus(null);
          setScanErrors([]);
          setIsScanning(false);
        });
      }

      console.log('Scan progress listener set up successfully');
    } else {
      console.log('window.api or window.api.onScanProgress not available');
      console.log('Available window.api methods:', window.api ? Object.keys(window.api) : 'none');
    }

    // Trailer batch progress listener
    if (window.api && window.api.onTrailerDownloadProgress) {
      unsubTrailer = window.api.onTrailerDownloadProgress((data) => {
        if (data.batch) {
          setTrailerProgress(data);
        }
      });
    }
    if (window.api && window.api.onTrailerBatchComplete) {
      unsubTrailerBatch = window.api.onTrailerBatchComplete(() => {
        setTrailerProgress(null);
      });
    }

    if (window.api && window.api.onLibraryContextChanged) {
      unsubLibrary = window.api.onLibraryContextChanged((context) => {
        window.dispatchEvent(new CustomEvent('library-context-changed', { detail: context }));
      });
    }

    return () => {
      unsubProgress && unsubProgress();
      unsubComplete && unsubComplete();
      unsubTrailer && unsubTrailer();
      unsubTrailerBatch && unsubTrailerBatch();
      unsubLibrary && unsubLibrary();
    };
  }, []);

  // Debug: log current state
  console.log('App render - scanStatus:', scanStatus);

  return (
    <OfflineProvider>
      <OfflineBanner />
      <ScanProgress scanStatus={scanStatus} trailerProgress={trailerProgress} />
      <Router>
        <Navbar onToggleTerminal={() => setShowTerminal(!showTerminal)} />
        <React.Suspense fallback={<div className="loading">{t('common.loading')}</div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/movies" element={<MoviesPage />} />
            <Route path="/shows" element={<ShowsPage />} />
            <Route path="/unmatched" element={<UnmatchedPage />} />
            <Route path="/detail/:type/:id" element={<DetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/storage" element={<StoragePage />} />
            <Route path="/show/:showId" element={<ShowDetailPage />} />
            <Route path="/show/:showId/episode/:season/:episode" element={<EpisodeDetailPage />} />
          </Routes>
        </React.Suspense>
      </Router>
    </OfflineProvider>
  );
}

export default App;
