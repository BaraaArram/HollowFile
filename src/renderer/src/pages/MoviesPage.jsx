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

function filterMovies(movies, search, genreFilter) {
  let filtered = movies;

  // Apply search filter
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(file => {
      const title = (file.final?.title || file.parsing?.cleanTitle || file.filename || '').toLowerCase();
      const year = (file.final?.year || file.parsing?.year || '').toString();
      const collection = (file.fullApiData?.movie?.belongs_to_collection?.name || '').toLowerCase();
      return title.includes(s) || year.includes(s) || collection.includes(s);
    });
  }

  // Apply genre filter
  if (genreFilter) {
    filtered = filtered.filter(file => {
      const genres = file.fullApiData?.movie?.genres || [];
      return genres.some(genre => genre.name === genreFilter);
    });
  }

  return filtered;
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
  const [gridDensity, setGridDensity] = useState('normal'); // 'compact', 'normal', 'dense'
  const [genreFilter, setGenreFilter] = useState(''); // genre filter from homepage
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

  // Refresh when scan runs from other pages
  useEffect(() => {
    if (!window.api?.onScanProgress) return;
    const unsub = window.api.onScanProgress((progress) => {
      if (progress.status === 'done' || progress.status === 'scan-complete') {
        if (!scanInProgress.current && window.api.getLastScanResults) {
          window.api.getLastScanResults().then((results) => {
            if (Array.isArray(results)) {
              setMovies(results.filter(f => f.final?.type === 'movie'));
            }
          });
        }
      }
    });
    return unsub;
  }, []);

  // Reload when images are changed via ImageBrowserModal
  useEffect(() => {
    const handler = () => {
      if (window.api?.getLastScanResults) {
        window.api.getLastScanResults().then((results) => {
          if (Array.isArray(results)) {
            setMovies(results.filter(f => f.final?.type === 'movie'));
          }
        });
      }
    };
    window.addEventListener('media-data-changed', handler);
    return () => window.removeEventListener('media-data-changed', handler);
  }, []);

  // Check for genre filter from navigation state
  useEffect(() => {
    const state = window.history?.state?.usr;
    if (state?.genreFilter) {
      setGenreFilter(state.genreFilter);
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

    const autoDownloadTrailers = localStorage.getItem('autoDownloadTrailers') === 'true';
    const trailerQuality = localStorage.getItem('trailerQuality') || '720';
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
      },
      { autoDownloadTrailers, trailerQuality }
    );
  };

  const handleBundleCollectionsChange = (val) => {
    setBundleCollections(val);
    localStorage.setItem('bundleCollections', val);
  };

  // Filter and sort movies
  const filteredMovies = filterMovies(movies, debouncedSearch, genreFilter);
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'title': {
        const titleA = (a.final?.title || a.parsing?.cleanTitle || a.filename || '').toLowerCase();
        const titleB = (b.final?.title || b.parsing?.cleanTitle || b.filename || '').toLowerCase();
        comparison = titleA.localeCompare(titleB);
        break;
      }
      case 'year': {
        const yearA = a.final?.year || a.parsing?.year || '0';
        const yearB = b.final?.year || b.parsing?.year || '0';
        comparison = yearA.localeCompare(yearB);
        break;
      }
      case 'rating': {
        const ratingA = a.final?.vote_average || a.fullApiData?.movie?.vote_average || 0;
        const ratingB = b.final?.vote_average || b.fullApiData?.movie?.vote_average || 0;
        comparison = ratingA - ratingB;
        break;
      }
      case 'popularity': {
        const popA = a.final?.popularity || a.fullApiData?.movie?.popularity || 0;
        const popB = b.final?.popularity || b.fullApiData?.movie?.popularity || 0;
        comparison = popA - popB;
        break;
      }
      default:
        comparison = 0;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const { collections, standalone } = bundleCollections ? groupByCollection(sortedMovies) : { collections: {}, standalone: sortedMovies };
  const hasResults = Object.keys(collections).length > 0 || standalone.length > 0;

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div className="page-hero">
        <div className="hero-content">
          <h1 className="page-title">Movies</h1>
          <p className="page-subtitle">
            {sortedMovies.length} movie{sortedMovies.length !== 1 ? 's' : ''} in your library
          </p>
        </div>
        <div className="hero-actions">
          <div className="status-badge">{status}</div>
          <button 
            onClick={handleScan} 
            className="primary-button" 
            disabled={scanDisabled}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M23 4v6h-6M1 20v-6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Rescan
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        {/* Search */}
        <div className="search-container">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, year, or collection..."
            className="search-input"
          />
          {genreFilter && (
            <div className="genre-filter-badge">
              <span>Genre: {genreFilter}</span>
              <button
                onClick={() => setGenreFilter('')}
                className="clear-filter"
                title="Clear genre filter"
              >
                ×
              </button>
            </div>
          )}
        </div>
        
        <div className="controls-group">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="title">Sort by Title</option>
            <option value="year">Sort by Year</option>
            <option value="rating">Sort by Rating</option>
            <option value="popularity">Sort by Popularity</option>
          </select>
          
          <button
            onClick={() => setSortOrder(order => order === 'asc' ? 'desc' : 'asc')}
            className="sort-toggle"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={`toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`toggle-button ${viewMode === 'list' ? 'active' : ''}`}
            >
              List
            </button>
        </div>
        
        <div className="grid-density-toggle">
          <button
            onClick={() => setGridDensity('normal')}
            className={`density-button ${gridDensity === 'normal' ? 'active' : ''}`}
          >
            Normal
          </button>
          <button
            onClick={() => setGridDensity('dense')}
            className={`density-button ${gridDensity === 'dense' ? 'active' : ''}`}
          >
            Dense
          </button>
          <button
            onClick={() => setGridDensity('compact')}
            className={`density-button ${gridDensity === 'compact' ? 'active' : ''}`}
          >
            Compact
          </button>
        </div>
      </div>
      </div>

      {/* Bundle Toggle */}
      <div className="bundle-toggle">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={bundleCollections}
            onChange={e => handleBundleCollectionsChange(e.target.checked)}
            className="toggle-checkbox"
          />
          <span className="toggle-slider"></span>
          Group movies into collections
        </label>
        {bundleCollections && Object.keys(collections).length > 0 && (
          <span className="collection-count">
            ({Object.keys(collections).length} collections)
          </span>
        )}
      </div>

      {/* Collections Section */}
      {bundleCollections && Object.keys(collections).length > 0 ? (
        <div className="collections-section">
          {Object.entries(collections).map(([name, group]) => (
            <div key={name} className="collection-group">
              <div className="collection-header">
                <h2 className="collection-title">{name}</h2>
                <span className="collection-badge">
                  {group.length} movie{group.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className={`movie-grid ${viewMode} ${gridDensity}`}>
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
      ) : null}

      {/* Standalone Movies */}
      <div className={`movie-grid ${viewMode} ${gridDensity}`}>
        {!hasResults && (
          <div className="empty-state">
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