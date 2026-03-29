import React, { useEffect, useState } from 'react';
import ShowCard from '../components/ShowCard';
import EpisodeCard from '../components/EpisodeCard';

function groupBySeason(episodes) {
  const seasons = {};
  for (const ep of episodes) {
    const season = ep.parsing?.season || ep.fullApiData?.episode?.season_number || '1';
    if (!seasons[season]) seasons[season] = [];
    seasons[season].push(ep);
  }
  return seasons;
}

function filterShows(shows, search) {
  if (!search) return shows;
  const s = search.toLowerCase();
  return shows.filter(([title, episodes]) => {
    const showTitle = title.toLowerCase();
    const year = (episodes[0]?.final?.year || episodes[0]?.parsing?.year || '').toString();
    return showTitle.includes(s) || year.includes(s);
  });
}

export default function ShowsPage() {
  const [shows, setShows] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const loadShows = () => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          const tvs = results.filter(f => f.final?.type === 'tv');
          const grouped = {};
          for (const ep of tvs) {
            const title = ep.final?.title || ep.parsing?.cleanTitle || ep.filename;
            if (!grouped[title]) grouped[title] = [];
            grouped[title].push(ep);
          }
          setShows(Object.entries(grouped));
        }
      });
    }
  };

  useEffect(() => {
    loadShows();
  }, []);

  // Refresh when scan makes progress from any page
  useEffect(() => {
    if (!window.api?.onScanProgress) return;
    const unsub = window.api.onScanProgress((progress) => {
      if (progress.status === 'done' || progress.status === 'scan-complete') {
        loadShows();
      }
    });
    return unsub;
  }, []);

  // Reload when images are changed via ImageBrowserModal
  useEffect(() => {
    const handler = () => loadShows();
    window.addEventListener('media-data-changed', handler);
    return () => window.removeEventListener('media-data-changed', handler);
  }, []);

  const filteredShows = filterShows(shows, debouncedSearch);
  const sortedShows = [...filteredShows].sort((a, b) => {
    const [titleA, episodesA] = a;
    const [titleB, episodesB] = b;
    const seasonsA = groupBySeason(episodesA);
    const seasonsB = groupBySeason(episodesB);
    let comparison = 0;
    switch (sortBy) {
      case 'title': comparison = titleA.localeCompare(titleB); break;
      case 'year': {
        const yearA = episodesA[0]?.final?.year || episodesA[0]?.parsing?.year || '0';
        const yearB = episodesB[0]?.final?.year || episodesB[0]?.parsing?.year || '0';
        comparison = yearA.localeCompare(yearB); break;
      }
      case 'episodes': comparison = episodesA.length - episodesB.length; break;
      case 'seasons': comparison = Object.keys(seasonsA).length - Object.keys(seasonsB).length; break;
      default: comparison = titleA.localeCompare(titleB);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalEpisodes = sortedShows.reduce((t, [, eps]) => t + eps.length, 0);

  return (
    <div className="sp">
      {/* Hero */}
      <section className="sp-hero">
        <div className="sp-hero-glow" />
        <div className="sp-hero-content">
          <h1 className="sp-title">TV Shows</h1>
          <p className="sp-subtitle">
            {sortedShows.length} show{sortedShows.length !== 1 ? 's' : ''} &bull; {totalEpisodes} episode{totalEpisodes !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Filters */}
      <div className="sp-filters">
        <div className="sp-search-wrap">
          <svg className="sp-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search shows..."
            className="sp-search"
          />
        </div>
        <div className="sp-controls">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sp-select">
            <option value="title">Title</option>
            <option value="year">Year</option>
            <option value="episodes">Episodes</option>
            <option value="seasons">Seasons</option>
          </select>
          <button className="sp-sort-btn" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="sp-grid">
        {sortedShows.length === 0 && (
          <div className="sp-empty">
            {search ? 'No shows found matching your search.' : 'No TV shows found.'}
          </div>
        )}
        {sortedShows.map(([title, episodes], idx) => {
          const showPoster = episodes[0].final?.poster || episodes[0].final?.poster_path;
          const year = episodes[0].final?.year || episodes[0].parsing?.year || '';
          const showId = episodes[0].final?.id || episodes[0].fullApiData?.show?.id || title;
          const seasons = groupBySeason(episodes);
          return (
            <ShowCard key={title + idx} title={title} poster={showPoster} year={year} seasons={seasons} showId={showId}>
              {Object.entries(seasons)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([season, eps]) => (
                  <div key={season} className="sp-season">
                    <div className="sp-season-header">
                      <span>Season {season}</span>
                      <span className="sp-season-badge">{eps.length} ep{eps.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="sp-episodes">
                      {eps
                        .sort((a, b) => (a.parsing?.episode || 0) - (b.parsing?.episode || 0))
                        .map((ep, i) => (
                          <EpisodeCard key={ep.filename + i} episode={ep} season={season} number={ep.parsing?.episode || '?'} />
                        ))}
                    </div>
                  </div>
                ))}
            </ShowCard>
          );
        })}
      </div>
    </div>
  );
}