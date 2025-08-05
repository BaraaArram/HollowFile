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
  const [sortBy, setSortBy] = useState('title'); // 'title', 'year', 'rating', 'popularity'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const scanInProgress = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
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

  // Filter and sort movies
  const filteredMovies = filterMovies(movies, debouncedSearch);
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'title':
        const titleA = (a.final?.title || a.parsing?.cleanTitle || a.filename || '').toLowerCase();
        const titleB = (b.final?.title || b.parsing?.cleanTitle || b.filename || '').toLowerCase();
        comparison = titleA.localeCompare(titleB);
        break;
      case 'year':
        const yearA = a.final?.year || a.parsing?.year || '0';
        const yearB = b.final?.year || b.parsing?.year || '0';
        comparison = yearA.localeCompare(yearB);
        break;
      case 'rating':
        const ratingA = a.final?.vote_average || a.fullApiData?.movie?.vote_average || 0;
        const ratingB = b.final?.vote_average || b.fullApiData?.movie?.vote_average || 0;
        comparison = ratingA - ratingB;
        break;
      case 'popularity':
        const popA = a.final?.popularity || a.fullApiData?.movie?.popularity || 0;
        const popB = b.final?.popularity || b.fullApiData?.movie?.popularity || 0;
        comparison = popA - popB;
        break;
      default:
        comparison = 0;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const { collections, standalone } = bundleCollections ? groupByCollection(sortedMovies) : { collections: {}, standalone: sortedMovies };
  const hasResults = Object.keys(collections).length > 0 || standalone.length > 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
      {/* Header Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '2rem', 
        flexWrap: 'wrap' 
      }}>
        <div className="hk-navbar-status" style={{ 
          margin: 0, 
          background: '#232849cc', 
          fontSize: 15, 
          padding: '0.5rem 1rem', 
          borderRadius: 10 
        }}>
          {status}
        </div>
        <button 
          onClick={handleScan} 
          className="hk-navbar-btn" 
          style={{ fontSize: 16, padding: '0.6rem 1.5rem' }} 
          disabled={scanDisabled}
        >
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
          <label htmlFor="bundleCollections" style={{ 
            color: 'var(--hk-accent)', 
            fontWeight: 700, 
            fontSize: 15, 
            cursor: 'pointer' 
          }}>
            Bundle collections
          </label>
        </div>
      </div>

      {/* Search and Sort Controls */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16, 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 300 }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title, year, or collection..."
          style={{
              width: '100%',
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
        
        {/* Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{
              background: 'var(--hk-bg-alt)',
              color: 'var(--hk-text)',
              border: '1.5px solid var(--hk-border)',
              borderRadius: 8,
              fontSize: 14,
              padding: '0.6rem 0.8rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="title">Sort by Title</option>
            <option value="year">Sort by Year</option>
            <option value="rating">Sort by Rating</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
          
          <button
            onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
            style={{
              background: 'var(--hk-accent)',
              color: '#232849',
              border: 'none',
              borderRadius: 8,
              padding: '0.6rem 0.8rem',
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#1c2038', borderRadius: 8, padding: 2 }}>
            <button
              onClick={() => setViewMode('grid')}
              style={{
                background: viewMode === 'grid' ? 'var(--hk-accent)' : 'transparent',
                color: viewMode === 'grid' ? '#232849' : '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                background: viewMode === 'list' ? 'var(--hk-accent)' : 'transparent',
                color: viewMode === 'list' ? '#232849' : '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ 
        display: 'flex', 
        gap: 16, 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          background: '#1c2038', 
          padding: '8px 16px', 
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          color: '#fff'
        }}>
          {sortedMovies.length} Movie{sortedMovies.length !== 1 ? 's' : ''}
        </div>
        {bundleCollections && Object.keys(collections).length > 0 && (
          <div style={{ 
            background: '#1c2038', 
            padding: '8px 16px', 
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff'
          }}>
            {Object.keys(collections).length} Collection{Object.keys(collections).length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <h1 style={{ 
        marginBottom: '2.2rem', 
        marginTop: 0, 
        fontSize: 32, 
        fontWeight: 900, 
        letterSpacing: 0.5 
      }}>
        Movies
      </h1>

      {/* Collections Section */}
      {bundleCollections && Object.keys(collections).length > 0 && (
        <div style={{ marginBottom: 40 }}>
          {Object.entries(collections).map(([name, group]) => (
            <div key={name} style={{ marginBottom: 32 }}>
              <div style={{ 
                fontWeight: 800, 
                fontSize: 22, 
                color: 'var(--hk-accent)', 
                marginBottom: 12, 
                letterSpacing: 0.2,
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <span>{name}</span>
                <span style={{ 
                  background: '#1c2038', 
                  padding: '4px 12px', 
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  {group.length} movie{group.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="hk-grid" style={{ 
                margin: 0,
                gridTemplateColumns: viewMode === 'list' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: viewMode === 'list' ? 12 : 24
              }}>
                {group.map((file, idx) => (
                  <MovieCard 
                    key={file.filename + idx} 
                    file={file} 
                    onClick={() => navigate(`/detail/movie/${file.final?.id || file.fullApiData?.movie?.id || file.filename}`, { state: { movie: file } })}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Standalone Movies */}
      <div className="hk-grid" style={{ 
        margin: 0,
        gridTemplateColumns: viewMode === 'list' ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: viewMode === 'list' ? 12 : 24
      }}>
        {!hasResults && (
          <div style={{ 
            color: 'var(--hk-text-muted)', 
            fontSize: 18, 
            gridColumn: '1/-1',
            textAlign: 'center',
            padding: '3rem 0'
          }}>
            {search ? 'No movies found matching your search.' : 'No movies found.'}
          </div>
        )}
        {standalone.map((file, idx) => (
          <MovieCard 
            key={file.filename + idx} 
            file={file} 
            onClick={() => navigate(`/detail/movie/${file.final?.id || file.fullApiData?.movie?.id || file.filename}`, { state: { movie: file } })}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  );
} 