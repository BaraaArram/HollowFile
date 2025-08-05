import React, { useState, useEffect, useRef } from 'react';
import MovieCard from '../components/MovieCard';
import { useNavigate } from 'react-router-dom';

function groupByCollection(movies) {
  const collections = {};
  const standalone = [];
  for (const movie of movies) {
    const collection = movie.fullApiData?.movie?.belongs_to_collection?.name;
    if (collection) {
      if (!collections[collection]) collections[collection] = [];
      collections[collection].push(movie);
    } else {
      standalone.push(movie);
    }
  }
  return { collections, standalone };
}

function filterMovies(movies, search) {
  if (!search) return movies;
  const s = search.toLowerCase();
  return movies.filter(file => {
    const title = (file.final?.title || file.parsing?.cleanTitle || file.filename || '').toLowerCase();
    const year = (file.final?.year || file.parsing?.year || '').toString();
    const collection = (file.fullApiData?.movie?.belongs_to_collection?.name || '').toLowerCase();
    return title.includes(s) || year.includes(s) || collection.includes(s);
  });
}

export default function MoviesPage() {
  const [currentDir, setCurrentDir] = useState(null);
  const [status, setStatus] = useState('');
  const [scanDisabled, setScanDisabled] = useState(true);
  const [movies, setMovies] = useState([]);
  const [bundleCollections, setBundleCollections] = useState(() => localStorage.getItem('bundleCollections') === 'true');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const scanInProgress = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (window.api && window.api.getSavedDir) {
      window.api.getSavedDir().then((dir) => {
        setCurrentDir(dir);
        setScanDisabled(!dir);
        setStatus(dir ? `Directory: ${dir}` : 'No directory selected');
      });
    }
    // Load last scan results
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          setMovies(results.filter(f => f.final?.type === 'movie'));
        }
      });
    }
  }, []);

  const handleScan = () => {
    if (!currentDir || scanInProgress.current) return;
    setStatus(`Scanning: ${currentDir}`);
    scanInProgress.current = true;
    
    // Load and display existing results immediately before starting scan
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          setMovies(results.filter(f => f.final?.type === 'movie'));
        }
      });
    }

    window.api.scanDirectoryStream(
      currentDir,
      (result) => {
        if (result.final?.type === 'movie') {
          setMovies(prev => {
            if (prev.some(f => f.filename === result.filename)) return prev;
            return [...prev, result];
          });
        }
      },
      () => {
        scanInProgress.current = false;
      }
    );
  };

  const handleBundleCollectionsChange = (val) => {
    setBundleCollections(val);
    localStorage.setItem('bundleCollections', val);
  };

  // Filter movies by search
  const filteredMovies = filterMovies(movies, debouncedSearch);
  const { collections, standalone } = bundleCollections ? groupByCollection(filteredMovies) : { collections: {}, standalone: filteredMovies };
  const hasResults = Object.keys(collections).length > 0 || standalone.length > 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div className="hk-navbar-status" style={{ margin: 0, background: '#232849cc', fontSize: 15, padding: '0.5rem 1rem', borderRadius: 10 }}>
          {status}
        </div>
        <button onClick={handleScan} className="hk-navbar-btn" style={{ fontSize: 16, padding: '0.6rem 1.5rem' }} disabled={scanDisabled}>
          <span role="img" aria-label="scan" style={{ marginRight: 8 }}>🔍</span>
          Scan
        </button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="bundleCollections"
            checked={bundleCollections}
            onChange={e => handleBundleCollectionsChange(e.target.checked)}
            style={{ accentColor: 'var(--hk-accent)', width: 18, height: 18 }}
          />
          <label htmlFor="bundleCollections" style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
            Bundle collections
          </label>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 32 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, year, or collection..."
          style={{
            flex: 1,
            background: 'var(--hk-bg-alt)',
            color: 'var(--hk-text)',
            border: '1.5px solid var(--hk-border)',
            borderRadius: 12,
            fontSize: 17,
            padding: '0.7rem 1.2rem',
            outline: 'none',
            boxShadow: '0 0 8px #23284933',
            fontFamily: 'var(--hk-font)',
            transition: 'border 0.18s, box-shadow 0.18s',
          }}
        />
      </div>
      <h1 style={{ marginBottom: '2.2rem', marginTop: 0, fontSize: 32, fontWeight: 900, letterSpacing: 0.5 }}>Movies</h1>
      {bundleCollections && Object.keys(collections).length > 0 && (
        <div style={{ marginBottom: 40 }}>
          {Object.entries(collections).map(([name, group]) => (
            <div key={name} style={{ marginBottom: 32 }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--hk-accent)', marginBottom: 12, letterSpacing: 0.2 }}>{name}</div>
              <div className="hk-grid" style={{ margin: 0 }}>
                {group.map((file, idx) => (
                  <MovieCard key={file.filename + idx} file={file} onClick={() => navigate(`/detail/movie/${file.final?.id || file.fullApiData?.movie?.id || file.filename}`, { state: { movie: file } })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="hk-grid" style={{ margin: 0 }}>
        {!hasResults && <div style={{ color: 'var(--hk-text-muted)', fontSize: 18, gridColumn: '1/-1' }}>No results found.</div>}
        {standalone.map((file, idx) => (
          <MovieCard key={file.filename + idx} file={file} onClick={() => navigate(`/detail/movie/${file.final?.id || file.fullApiData?.movie?.id || file.filename}`, { state: { movie: file } })} />
        ))}
      </div>
    </div>
  );
} 