import React, { useEffect, useState } from 'react';
import './App.css';
import './style.css';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
const MoviesPage = React.lazy(() => import('./pages/MoviesPage'));
const ShowsPage = React.lazy(() => import('./pages/ShowsPage'));
const UnmatchedPage = React.lazy(() => import('./pages/UnmatchedPage'));
const DetailPage = React.lazy(() => import('./pages/DetailPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const ShowDetailPage = React.lazy(() => import('./pages/ShowDetailPage'));
const EpisodeDetailPage = React.lazy(() => import('./pages/EpisodeDetailPage'));

// Utility to load person data from results/people/ by ID
async function loadPersonById(personId) {
  // Use window.api only
  if (window.api && window.api.readPersonData) {
    return await window.api.readPersonData(personId);
  }
  return null;
}

const NAV_TABS = [
  { key: 'movies', label: 'Movies' },
  { key: 'shows', label: 'TV Shows' },
  { key: 'unmatched', label: 'Unmatched' },
];

function TopNav({ page, setPage, darkMode, setDarkMode }) {
  return (
    <nav className="sticky-nav">
      <div className="nav-logo">HollowFile</div>
      <div className="nav-tabs">
        {NAV_TABS.map(tab => (
          <button
            key={tab.key}
            className={`nav-tab${page === tab.key ? ' active' : ''}`}
            onClick={() => setPage(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <button
        className="nav-tab"
        style={{ fontWeight: 700, marginLeft: 24 }}
        onClick={() => setDarkMode(dm => !dm)}
        aria-label="Toggle dark mode"
      >
        {darkMode ? '🌙' : '☀️'}
      </button>
    </nav>
  );
}

function MovieCard({ file, onShowDetails }) {
  const final = file.final || {};
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  let posterPath = '';
  if (final.poster && typeof final.poster === 'string') {
    posterPath = final.poster.startsWith('file://') ? final.poster : `file://${final.poster}`;
  }
  return (
    <div className="streaming-card movie-card" onClick={() => onShowDetails(file)}>
      <div className="card-poster">
        {posterPath && !imgError ? (
          <img
            src={posterPath}
            alt="Poster"
            className={imgLoaded ? 'loaded' : ''}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            draggable={false}
          />
        ) : (
          <div className="card-poster-placeholder">N/A</div>
        )}
        <div className="card-overlay">
          <div className="card-title">{final.title || file.filename}</div>
          <div className="card-meta">{final.year || 'Year N/A'}</div>
          {final.vote_average && (
            <span className="card-badge">★ {final.vote_average}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MovieModal({ file, onClose }) {
  const final = file.final || {};
  return (
    <div className="streaming-modal-backdrop" onClick={onClose}>
      <div className="streaming-modal-content" onClick={e => e.stopPropagation()}>
        <div className="streaming-modal-header">
          <span style={{ fontWeight: 700, fontSize: 22 }}>{final.title}</span>
          <button className="streaming-modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 24, padding: 24 }}>
          <div style={{ flex: '0 0 180px' }}>
            {final.poster ? (
              <img src={`file://${final.poster}`} alt="Poster" style={{ width: 180, borderRadius: 12 }} />
            ) : (
              <div className="card-poster-placeholder" style={{ width: 180, height: 270, background: '#22232b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N/A</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ fontSize: 24 }}>{final.title}</div>
            <div className="card-meta">{final.year} {final.vote_average && <span className="card-badge">★ {final.vote_average}</span>}</div>
            <div style={{ color: '#b3b3b3', margin: '18px 0' }}>{final.overview}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowCard({ group, onShowEpisodes }) {
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  let posterPath = '';
  if (group.poster && typeof group.poster === 'string') {
    posterPath = group.poster.startsWith('file://') ? group.poster : `file://${group.poster}`;
  }
  return (
    <div className="streaming-card show-card" onClick={() => onShowEpisodes(group)}>
      <div className="card-poster">
        {posterPath && !imgError ? (
            <img
            src={posterPath}
              alt="Poster"
            className={imgLoaded ? 'loaded' : ''}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            draggable={false}
            />
          ) : (
          <div className="card-poster-placeholder">N/A</div>
        )}
        <div className="card-overlay">
          <div className="card-title">{group.showTitle}</div>
          <div className="card-meta">{group.year || 'Year N/A'}</div>
        </div>
      </div>
    </div>
  );
}

function ShowModal({ group, onClose }) {
  return (
    <div className="streaming-modal-backdrop" onClick={onClose}>
      <div className="streaming-modal-content" onClick={e => e.stopPropagation()}>
        <div className="streaming-modal-header">
          <span style={{ fontWeight: 700, fontSize: 22 }}>{group.showTitle} Episodes</span>
          <button className="streaming-modal-close" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 24, padding: 24 }}>
          <div style={{ flex: '0 0 180px' }}>
            {group.poster ? (
              <img src={`file://${group.poster}`} alt="Poster" style={{ width: 180, borderRadius: 12 }} />
            ) : (
              <div className="card-poster-placeholder" style={{ width: 180, height: 270, background: '#22232b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N/A</div>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div className="card-title" style={{ fontSize: 24 }}>{group.showTitle}</div>
            <div className="card-meta">{group.year}</div>
            <div className="streaming-modal-episodes-list">
              {group.files
                .sort((a, b) => {
                  const sa = a.parsing?.season || 0;
                  const sb = b.parsing?.season || 0;
                  if (sa !== sb) return sa - sb;
                  const ea = a.parsing?.episode || 0;
                  const eb = b.parsing?.episode || 0;
                  return ea - eb;
                })
                .map((file, idx) => (
                  <div key={idx} className="episode-card">
                    <div className="episode-card-title">
                      S{file.parsing?.season?.toString().padStart(2, '0') || '??'}E{file.parsing?.episode?.toString().padStart(2, '0') || '??'}
                      {': '}
                      {file.final?.title || file.parsing?.cleanTitle || file.filename}
                    </div>
                    <div className="episode-card-meta">
                      <span>{file.final?.year || ''}</span>
                    </div>
                    <div className="episode-card-filename">{file.filename}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
              </div>
  );
}

function UnmatchedCard({ file }) {
  const parsing = file.parsing || {};
  return (
    <div className="streaming-card unmatched">
      <div className="card-title" style={{ color: '#e50914', padding: 18 }}>{file.filename}</div>
      <div className="card-meta" style={{ padding: '0 18px 18px 18px' }}>
        <span>Unmatched</span>
        <div style={{ fontSize: 13, color: '#e50914', marginTop: 8 }}>
          <div><strong>Clean Title:</strong> {parsing.cleanTitle}</div>
          <div><strong>Year:</strong> {parsing.year}</div>
          <div><strong>Is TV Show?:</strong> {parsing.isTV ? 'Yes' : 'No'}</div>
        </div>
      </div>
    </div>
  );
}

function StreamingGrid({ children }) {
  return <div className="streaming-grid">{children}</div>;
}

function StreamingPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pageNumbers = [];
  const maxPagesToShow = 7;
  let startPage = Math.max(1, currentPage - 3);
  let endPage = Math.min(totalPages, currentPage + 3);
  if (endPage - startPage < maxPagesToShow - 1) {
    if (startPage === 1) {
      endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    } else if (endPage === totalPages) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }
  // Local state for jump-to-page
  const [jumpPage, setJumpPage] = React.useState('');
  const handleJump = (e) => {
    e.preventDefault();
    const num = parseInt(jumpPage, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      onPageChange(num);
      setJumpPage('');
    }
  };
  return (
    <div className="streaming-pagination">
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="streaming-pagination-btn">First</button>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="streaming-pagination-btn">Prev</button>
      {startPage > 1 && <span style={{ color: '#888' }}>...</span>}
      {pageNumbers.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`streaming-pagination-btn${page === currentPage ? ' active' : ''}`}
        >{page}</button>
      ))}
      {endPage < totalPages && <span style={{ color: '#888' }}>...</span>}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="streaming-pagination-btn">Next</button>
      <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="streaming-pagination-btn">Last</button>
      {/* Jump to page input */}
      <form onSubmit={handleJump} style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 12 }}>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={jumpPage}
          onChange={e => setJumpPage(e.target.value)}
          placeholder="Page #"
          style={{ width: 60, padding: '4px 6px', borderRadius: 5, border: '1px solid #bdbdbd', marginRight: 4 }}
        />
        <button type="submit" className="streaming-pagination-btn" style={{ padding: '4px 10px', fontSize: 14 }}>Go</button>
      </form>
    </div>
  );
}

const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime', 99: 'Documentary',
  18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction', 10770: 'TV Movie', 53: 'Thriller',
  10752: 'War', 37: 'Western'
};

function MovieDetailPage({ movie, onBack }) {
  const final = movie.final || {};
  const api = (movie.apiInfo && movie.apiInfo[0] && movie.apiInfo[0].results && movie.apiInfo[0].results[0]) || {};
  const genres = (api.genre_ids || []).map(id => GENRE_MAP[id] || id).join(', ');
  const posterPath = final.poster && typeof final.poster === 'string' ? (final.poster.startsWith('file://') ? final.poster : `file://${final.poster}`) : '';
  const backdropPath = api.backdrop_path ? `https://image.tmdb.org/t/p/w1280${api.backdrop_path}` : null;
  const [cast, setCast] = React.useState([]);
  const [crew, setCrew] = React.useState([]);

  // Load cast and crew from shared people storage
  React.useEffect(() => {
    let cancelled = false;
    async function loadPeople() {
      if (!movie.castIds && !movie.crewIds) return;
      const castArr = [];
      const crewArr = [];
      if (Array.isArray(movie.castIds)) {
        for (const id of movie.castIds.slice(0, 8)) {
          const person = await loadPersonById(id);
          if (person) castArr.push(person);
  }
      }
      if (Array.isArray(movie.crewIds)) {
        for (const id of movie.crewIds.slice(0, 3)) {
          const person = await loadPersonById(id);
          if (person) crewArr.push(person);
}
      }
      if (!cancelled) {
        setCast(castArr);
        setCrew(crewArr);
      }
    }
    loadPeople();
    return () => { cancelled = true; };
  }, [movie.castIds, movie.crewIds]);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 32 }}>
      <button className="streaming-pagination-btn" style={{ marginBottom: 24 }} onClick={onBack}>← Back to Movies</button>
      {backdropPath && (
        <div style={{ width: '100%', height: 220, background: `url(${backdropPath}) center/cover`, borderRadius: 18, marginBottom: 32, filter: 'brightness(0.7)' }} />
      )}
      <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 220px' }}>
          {posterPath ? (
            <img src={posterPath} alt="Poster" style={{ width: 220, borderRadius: 12, boxShadow: '0 4px 24px #0008' }} />
          ) : (
            <div className="card-poster-placeholder" style={{ width: 220, height: 330, background: '#22232b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>N/A</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="card-title" style={{ fontSize: 32, marginBottom: 8 }}>{final.title}</div>
          <div className="card-meta" style={{ fontSize: 18, marginBottom: 8 }}>{final.year} {genres && <>• {genres}</>}</div>
          <div style={{ marginBottom: 12 }}>
            {api.release_date && <span className="card-badge">Release: {api.release_date}</span>}
            {api.original_language && <span className="card-badge">Lang: {api.original_language.toUpperCase()}</span>}
            {final.vote_average && <span className="card-badge">★ {final.vote_average} ({final.vote_count})</span>}
            {api.popularity && <span className="card-badge">Popularity: {api.popularity}</span>}
          </div>
          <div style={{ color: '#b3b3b3', marginBottom: 18 }}>{final.overview}</div>
          {api.title && (
            <div style={{ color: '#888', fontSize: 15, marginBottom: 8 }}><b>Original Title:</b> {api.original_title}</div>
          )}
          {api.id && (
            <a href={`https://www.themoviedb.org/movie/${api.id}`} target="_blank" rel="noopener noreferrer" className="card-badge" style={{ textDecoration: 'none', marginRight: 8 }}>View on TMDB</a>
          )}
        </div>
      </div>
      {/* Cast, Crew */}
      <div style={{ marginTop: 36 }}>
        {cast.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 22, marginBottom: 12 }}>Cast</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {cast.map(actor => (
                <div key={actor.id} style={{ width: 90, textAlign: 'center' }}>
                  {actor.profile_path ? (
                    <img src={`file://${actor.profile_path}`} alt={actor.name} style={{ width: 70, height: 105, objectFit: 'cover', borderRadius: 8, marginBottom: 6, background: '#23232b' }} />
                  ) : (
                    <div style={{ width: 70, height: 105, background: '#23232b', borderRadius: 8, margin: '0 auto 6px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 13 }}>N/A</div>
                  )}
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{actor.name}</div>
                  <div style={{ color: '#b3b3b3', fontSize: 13 }}>{actor.character}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {crew.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div className="card-title" style={{ fontSize: 22, marginBottom: 12 }}>Crew</div>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {crew.map(member => (
                <div key={member.id} style={{ width: 120, textAlign: 'center' }}>
                  {member.profile_path ? (
                    <img src={`file://${member.profile_path}`} alt={member.name} style={{ width: 70, height: 105, objectFit: 'cover', borderRadius: 8, marginBottom: 6, background: '#23232b' }} />
                  ) : null}
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{member.name}</div>
                  <div style={{ color: '#b3b3b3', fontSize: 13 }}>{member.job}</div>
              </div>
            ))}
            </div>
        </div>
      )}
      </div>
    </div>
  );
}

function App() {
  const [scanStatus, setScanStatus] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanErrors, setScanErrors] = useState([]);

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
    
    if (window.api && window.api.onScanProgress) {
      console.log('Setting up scan progress listener...');
      const unsub = window.api.onScanProgress((progress) => {
        console.log('Received scan progress:', progress);
        setScanStatus(progress);
        
        // Show modal for any scanning activity
        if (progress.status && progress.status !== 'scan-complete') {
          console.log('Setting showScanModal to true');
        setShowScanModal(true);
        }
        
        // Track errors
        if (progress.error) {
          setScanErrors(prev => [...prev, { file: progress.filename, error: progress.error }]);
        }
        
        // Hide modal after scan-complete with delay
        if (progress.status === 'scan-complete') {
          setTimeout(() => {
            setShowScanModal(false);
            setScanErrors([]); // Clear errors on completion
          }, 2000);
        }
      });
      console.log('Scan progress listener set up successfully');
      return () => { 
        console.log('Cleaning up scan progress listener');
        unsub && unsub(); 
      };
    } else {
      console.log('window.api or window.api.onScanProgress not available');
      console.log('Available window.api methods:', window.api ? Object.keys(window.api) : 'none');
    }
  }, []);

  // Debug: log current state
  console.log('App render - showScanModal:', showScanModal, 'scanStatus:', scanStatus);

  return (
    <Router>
      {showScanModal && scanStatus && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100vw', 
          height: '100vh', 
          background: '#232849cc', 
          zIndex: 9999, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{ 
            background: '#232849', 
            borderRadius: 16, 
            boxShadow: '0 0 32px #0008', 
            padding: '2.5rem 2.5rem', 
            minWidth: 340, 
            maxWidth: '90%',
            textAlign: 'center', 
            color: 'var(--hk-accent)',
            border: '1px solid var(--hk-border)'
          }}>
            <div style={{ fontWeight: 900, fontSize: 26, marginBottom: 18 }}>Scanning Library...</div>
            <div style={{ fontSize: 18, marginBottom: 10 }}>
              <b>Step:</b> {scanStatus.status ? scanStatus.status.replace(/-/g, ' ') : 'Processing...'}
            </div>
            {scanStatus.filename && (
              <div style={{ fontSize: 16, marginBottom: 8, wordBreak: 'break-word' }}>
                <b>File:</b> {scanStatus.filename}
              </div>
            )}
            {scanStatus.personName && (
              <div style={{ fontSize: 16, marginBottom: 8 }}>
                <b>Person:</b> {scanStatus.personName}
              </div>
            )}
            {/* Progress Bar */}
            {scanStatus.totalFiles > 0 && scanStatus.currentFileIndex > 0 && (
              <div style={{ margin: '18px 0 0 0' }}>
                <div style={{ 
                  height: 16, 
                  background: '#1c2038', 
                  borderRadius: 8, 
                  overflow: 'hidden', 
                  boxShadow: '0 0 8px #7e8ee655', 
                  marginBottom: 6 
                }}>
                  <div style={{ 
                    width: `${Math.round((scanStatus.currentFileIndex / scanStatus.totalFiles) * 100)}%`, 
                    height: '100%', 
                    background: scanStatus.error ? '#e55' : 'var(--hk-accent)', 
                    transition: 'width 0.3s, background 0.3s',
                    boxShadow: scanStatus.error ? '0 0 12px #e55' : '0 0 12px var(--hk-accent)'
                  }} />
                </div>
                <div style={{ fontSize: 15, color: '#fff', opacity: 0.8 }}>
                  {scanStatus.currentFileIndex} / {scanStatus.totalFiles} ({Math.round((scanStatus.currentFileIndex / scanStatus.totalFiles) * 100)}%)
                  {scanErrors.length > 0 && (
                    <span style={{ color: '#e55', marginLeft: 8 }}>
                      ({scanErrors.length} error{scanErrors.length === 1 ? '' : 's'})
                    </span>
                  )}
                </div>
              </div>
            )}
            {scanStatus.error && (
              <div style={{ 
                marginTop: 12, 
                color: '#e55', 
                fontSize: 14,
                background: '#e551',
                padding: '8px 12px',
                borderRadius: 8,
                wordBreak: 'break-word'
              }}>
                Error: {scanStatus.error}
              </div>
            )}
            <div style={{ marginTop: 18, color: '#fff', fontSize: 14, opacity: 0.7 }}>
              {scanStatus.error 
                ? 'An error occurred. Processing will continue with the next file.' 
                : 'Please wait while we process your media files.'
              }
            </div>
            {/* Error Summary */}
            {scanErrors.length > 0 && (
              <div style={{ 
                marginTop: 24, 
                textAlign: 'left', 
                fontSize: 14,
                maxHeight: 120,
                overflowY: 'auto',
                background: '#1c2038',
                padding: 12,
                borderRadius: 8
              }}>
                <div style={{ color: '#e55', marginBottom: 8, fontWeight: 600 }}>Recent Errors:</div>
                {scanErrors.slice(-3).map((error, idx) => (
                  <div key={idx} style={{ 
                    color: '#fff', 
                    opacity: 0.8, 
                    marginBottom: 4,
                    fontSize: 13,
                    wordBreak: 'break-word'
                  }}>
                    • {error.file}: {error.error}
                  </div>
                ))}
                {scanErrors.length > 3 && (
                  <div style={{ color: '#fff', opacity: 0.6, fontSize: 12, marginTop: 4 }}>
                    ...and {scanErrors.length - 3} more error(s)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <Navbar />
      <React.Suspense fallback={<div className="loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Navigate to="/movies" />} />
          <Route path="/movies" element={<MoviesPage />} />
          <Route path="/shows" element={<ShowsPage />} />
          <Route path="/unmatched" element={<UnmatchedPage />} />
          <Route path="/detail/:type/:id" element={<DetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/show/:showId" element={<ShowDetailPage />} />
          <Route path="/show/:showId/episode/:season/:episode" element={<EpisodeDetailPage />} />
        </Routes>
      </React.Suspense>
    </Router>
  );
}

export default App;
