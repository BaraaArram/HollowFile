import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MovieCard from '../components/MovieCard';
import ShowCard from '../components/ShowCard';

function groupBySeason(episodes) {
  const seasons = {};
  for (const ep of episodes) {
    const season = ep.parsing?.season || ep.fullApiData?.episode?.season_number || '1';
    if (!seasons[season]) seasons[season] = [];
    seasons[season].push(ep);
  }
  return seasons;
}

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

function groupShowsByTitle(episodes) {
  const grouped = {};
  for (const ep of episodes) {
    const title = ep.final?.title || ep.parsing?.cleanTitle || ep.filename;
    if (!grouped[title]) grouped[title] = [];
    grouped[title].push(ep);
  }
  return Object.entries(grouped);
}

export default function HomePage() {
  const [stats, setStats] = useState({ movies: 0, shows: 0, episodes: 0, collections: 0 });
  const [recentMovies, setRecentMovies] = useState([]);
  const [recentShows, setRecentShows] = useState([]);
  const [popularGenres, setPopularGenres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const handleScan = async () => {
    if (scanning) return;
    const dir = window.api?.getSavedDir ? await window.api.getSavedDir() : null;
    if (!dir) {
      navigate('/settings');
      return;
    }
    setScanning(true);
    const autoDownloadTrailers = localStorage.getItem('autoDownloadTrailers') === 'true';
    const trailerQuality = localStorage.getItem('trailerQuality') || '720';
    window.api.scanDirectoryStream(
      dir,
      (progress) => {
        // Refresh data on every completed file
        if (progress.status === 'done' || progress.status === 'already-exists') {
          loadData();
        }
      },
      () => { setScanning(false); loadData(); },
      { autoDownloadTrailers, trailerQuality }
    );
  };

  // Listen for scan progress from other pages (global listener)
  useEffect(() => {
    if (!window.api?.onScanProgress) return;
    const unsub = window.api.onScanProgress((progress) => {
      if (progress.status === 'done') {
        loadData();
      } else if (progress.status === 'scan-complete') {
        loadData();
      }
    });
    return unsub;
  }, []);

  // Reload when images are changed via ImageBrowserModal
  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('media-data-changed', handler);
    return () => window.removeEventListener('media-data-changed', handler);
  }, []);

  const loadData = async () => {
    try {
      if (window.api && window.api.getLastScanResults) {
        const results = await window.api.getLastScanResults();
        if (Array.isArray(results)) {
          const movieFiles = results.filter(f => f.final?.type === 'movie');
          const { collections } = groupByCollection(movieFiles);
          const tvFiles = results.filter(f => f.final?.type === 'tv');
          const showsGrouped = groupShowsByTitle(tvFiles);

          setStats({
            movies: movieFiles.length,
            shows: showsGrouped.length,
            episodes: tvFiles.length,
            collections: Object.keys(collections).length
          });

          const sortedMovies = movieFiles
            .sort((a, b) => new Date(b.final?.release_date || 0) - new Date(a.final?.release_date || 0))
            .slice(0, 12);
          setRecentMovies(sortedMovies);

          const sortedShows = showsGrouped
            .sort((a, b) => {
              const aDate = a[1][0]?.final?.first_air_date || a[1][0]?.final?.release_date;
              const bDate = b[1][0]?.final?.first_air_date || b[1][0]?.final?.release_date;
              return new Date(bDate || 0) - new Date(aDate || 0);
            })
            .slice(0, 8);
          setRecentShows(sortedShows);

          const genreCount = {};
          movieFiles.forEach(movie => {
            const genres = movie.fullApiData?.movie?.genres || [];
            genres.forEach(genre => {
              genreCount[genre.name] = (genreCount[genre.name] || 0) + 1;
            });
          });
          const topGenres = Object.entries(genreCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6)
            .map(([name]) => name);
          setPopularGenres(topGenres);
        }
      }
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dp-loading"><div className="dp-loading-spinner" /><span>Loading your library...</span></div>;
  }

  return (
    <div className="hp">
      {/* Hero */}
      <section className="hp-hero">
        <div className="hp-hero-glow" />
        <div className="hp-hero-content">
          <h1 className="hp-title">Your Library</h1>
          <p className="hp-subtitle">
            {stats.movies} movies, {stats.shows} TV shows, and {stats.episodes} episodes
          </p>
        </div>
        <div className="hp-stats">
          <div className="hp-stat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="2" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M7 2v20M17 2v20M2 12h20" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="hp-stat-num">{stats.movies}</span>
            <span className="hp-stat-label">Movies</span>
          </div>
          <div className="hp-stat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M17 2l-5 5-5-5" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="hp-stat-num">{stats.shows}</span>
            <span className="hp-stat-label">TV Shows</span>
          </div>
          <div className="hp-stat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" stroke="var(--hk-accent)" strokeWidth="2"/><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/></svg>
            <span className="hp-stat-num">{stats.episodes}</span>
            <span className="hp-stat-label">Episodes</span>
          </div>
          <div className="hp-stat">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="hp-stat-num">{stats.collections}</span>
            <span className="hp-stat-label">Collections</span>
          </div>
        </div>
        <div className="hp-hero-actions">
          <button className="dp-btn dp-btn-play" onClick={handleScan} disabled={scanning}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8a7 7 0 0113.36-2.83M15 8A7 7 0 011.64 10.83" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M14 1v4h-4M2 15v-4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {scanning ? 'Scanning...' : 'Scan Library'}
          </button>
          <button className="dp-btn dp-btn-ghost" onClick={() => navigate('/movies')}>Browse All</button>
        </div>
      </section>

      {/* Recent Movies */}
      {recentMovies.length > 0 && (
        <section className="hp-section">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Recent Movies</h2>
            <button className="hp-view-all" onClick={() => navigate('/movies')}>View All &rarr;</button>
          </div>
          <div className="hp-grid">
            {recentMovies.slice(0, 6).map((movie, idx) => (
              <MovieCard key={movie.filename + idx} file={movie}
                onClick={() => navigate(`/detail/movie/${movie.final?.id || movie.fullApiData?.movie?.id || movie.filename}`, { state: { movie } })} />
            ))}
          </div>
        </section>
      )}

      {/* Recent Shows */}
      {recentShows.length > 0 && (
        <section className="hp-section">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Recent TV Shows</h2>
            <button className="hp-view-all" onClick={() => navigate('/shows')}>View All &rarr;</button>
          </div>
          <div className="hp-grid hp-grid-shows">
            {recentShows.slice(0, 6).map(([showTitle, episodes], idx) => {
              const showPoster = episodes[0]?.final?.poster || episodes[0]?.final?.poster_path;
              const year = episodes[0]?.final?.year || episodes[0]?.parsing?.year || '';
              const showId = episodes[0]?.final?.id || episodes[0]?.fullApiData?.show?.id || showTitle;
              const seasons = groupBySeason(episodes);
              return (
                <ShowCard key={showTitle + idx} title={showTitle} poster={showPoster} year={year} seasons={seasons} showId={showId} />
              );
            })}
          </div>
        </section>
      )}

      {/* Popular Genres */}
      {popularGenres.length > 0 && (
        <section className="hp-section">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Popular Genres</h2>
          </div>
          <div className="hp-genres">
            {popularGenres.map(genre => (
              <button key={genre} className="hp-genre" onClick={() => navigate('/movies', { state: { genreFilter: genre } })}>
                <span className="hp-genre-icon">{getGenreIcon(genre)}</span>
                <span className="hp-genre-name">{genre}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="hp-section">
        <div className="hp-section-header">
          <h2 className="hp-section-title">Quick Actions</h2>
        </div>
        <div className="hp-actions-grid">
          <button className="hp-action-card" onClick={() => navigate('/movies')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="2" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M7 2v20M17 2v20M2 12h20" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="hp-action-title">Browse Movies</span>
            <span className="hp-action-sub">Explore your movie collection</span>
          </button>
          <button className="hp-action-card" onClick={() => navigate('/shows')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="15" rx="2" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M17 2l-5 5-5-5" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span className="hp-action-title">Watch TV Shows</span>
            <span className="hp-action-sub">Discover your favorite series</span>
          </button>
          <button className="hp-action-card" onClick={() => navigate('/unmatched')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>
            <span className="hp-action-title">Fix Unmatched</span>
            <span className="hp-action-sub">Resolve unidentified files</span>
          </button>
          <button className="hp-action-card" onClick={() => navigate('/settings')}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" stroke="var(--hk-accent)" strokeWidth="2"/></svg>
            <span className="hp-action-title">Settings</span>
            <span className="hp-action-sub">Configure your library</span>
          </button>
        </div>
      </section>
    </div>
  );
}

function getGenreIcon(genre) {
  const icons = {
    'Action': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Adventure': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="10" r="3" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="var(--hk-accent)" strokeWidth="2"/></svg>,
    'Animation': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Comedy': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>,
    'Crime': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Documentary': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Drama': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M8 15h8M9 9h.01M15 9h.01" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>,
    'Family': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="9" cy="7" r="4" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Fantasy': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3v1m0 16v1m-9-9h1m16 0h1m-2.636-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="12" r="4" stroke="var(--hk-accent)" strokeWidth="2"/></svg>,
    'History': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M12 6v6l4 2" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Horror': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zM8 15s1.5-2 4-2 4 2 4 2" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/><path d="M9 9h.01M15 9h.01" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>,
    'Music': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="6" cy="18" r="3" stroke="var(--hk-accent)" strokeWidth="2"/><circle cx="18" cy="16" r="3" stroke="var(--hk-accent)" strokeWidth="2"/></svg>,
    'Mystery': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>,
    'Romance': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Science Fiction': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09zM12 15l-3-3" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M22 2l-7.5 7.5" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/><path d="M9.5 7L8 3.5 3.5 5 7 9.5M14.5 17l1.5 3.5 4.5-1.5L17 14.5" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Thriller': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'War': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    'Western': <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" stroke="var(--hk-accent)" strokeWidth="2"/></svg>
  };
  const defaultIcon = <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="2" stroke="var(--hk-accent)" strokeWidth="2"/><path d="M7 2v20M17 2v20M2 12h20" stroke="var(--hk-accent)" strokeWidth="2" strokeLinecap="round"/></svg>;
  return icons[genre] || defaultIcon;
}