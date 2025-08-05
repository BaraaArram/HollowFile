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
  const [sortBy, setSortBy] = useState('title'); // 'title', 'year', 'episodes', 'seasons'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc', 'desc'

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          // Group by show title
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
  }, []);

  // Filter and sort shows
  const filteredShows = filterShows(shows, debouncedSearch);
  const sortedShows = [...filteredShows].sort((a, b) => {
    const [titleA, episodesA] = a;
    const [titleB, episodesB] = b;
    const seasonsA = groupBySeason(episodesA);
    const seasonsB = groupBySeason(episodesB);
    
    let comparison = 0;
    switch (sortBy) {
      case 'title':
        comparison = titleA.localeCompare(titleB);
        break;
      case 'year':
        const yearA = episodesA[0]?.final?.year || episodesA[0]?.parsing?.year || '0';
        const yearB = episodesB[0]?.final?.year || episodesB[0]?.parsing?.year || '0';
        comparison = yearA.localeCompare(yearB);
        break;
      case 'episodes':
        const totalEpisodesA = episodesA.length;
        const totalEpisodesB = episodesB.length;
        comparison = totalEpisodesA - totalEpisodesB;
        break;
      case 'seasons':
        const totalSeasonsA = Object.keys(seasonsA).length;
        const totalSeasonsB = Object.keys(seasonsB).length;
        comparison = totalSeasonsA - totalSeasonsB;
        break;
      default:
        comparison = titleA.localeCompare(titleB);
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ 
          marginBottom: '1.5rem', 
          marginTop: 0, 
          fontSize: 32, 
          fontWeight: 900, 
          letterSpacing: 0.5 
        }}>
          TV Shows
        </h1>
        
        {/* Search and Controls */}
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
              placeholder="Search shows..."
              style={{
                width: '100%',
                background: 'var(--hk-bg-alt)',
                color: 'var(--hk-text)',
                border: '1.5px solid var(--hk-border)',
                borderRadius: 12,
                fontSize: 16,
                padding: '0.8rem 1.2rem',
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
              <option value="episodes">Sort by Episodes</option>
              <option value="seasons">Sort by Seasons</option>
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
          </div>
        </div>
        
        {/* Stats */}
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          marginBottom: 16,
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
            {sortedShows.length} Show{sortedShows.length !== 1 ? 's' : ''}
          </div>
          <div style={{ 
            background: '#1c2038', 
            padding: '8px 16px', 
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            color: '#fff'
          }}>
            {sortedShows.reduce((total, [_, episodes]) => total + episodes.length, 0)} Episode{sortedShows.reduce((total, [_, episodes]) => total + episodes.length, 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Shows Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: 24,
        margin: 0 
      }}>
        {sortedShows.length === 0 && (
          <div style={{ 
            gridColumn: '1/-1',
            textAlign: 'center',
            color: 'var(--hk-text-muted)', 
            fontSize: 18,
            padding: '3rem 0'
          }}>
            {search ? 'No shows found matching your search.' : 'No TV shows found.'}
          </div>
        )}
        
        {sortedShows.map(([title, episodes], idx) => {
          const showPoster = episodes[0].final?.poster || episodes[0].final?.poster_path;
          const year = episodes[0].final?.year || episodes[0].parsing?.year || '';
          const showId = episodes[0].final?.id || episodes[0].fullApiData?.show?.id || title;
          const seasons = groupBySeason(episodes);
          
          return (
            <ShowCard
              key={title + idx}
              title={title}
              poster={showPoster}
              year={year}
              seasons={seasons}
              showId={showId}
            >
              {Object.entries(seasons)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([season, eps]) => (
                  <div key={season} style={{ marginBottom: 16 }}>
                    <div style={{ 
                      fontWeight: 800, 
                      color: 'var(--hk-accent)', 
                      fontSize: 16, 
                      marginBottom: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8
                    }}>
                      <span>Season {season}</span>
                      <span style={{ 
                        background: '#1c2038', 
                        padding: '2px 8px', 
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        {eps.length} episode{eps.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                      gap: 8 
                    }}>
                      {eps
                        .sort((a, b) => (a.parsing?.episode || 0) - (b.parsing?.episode || 0))
                        .map((ep, i) => (
                          <EpisodeCard 
                            key={ep.filename + i} 
                            episode={ep} 
                            season={season} 
                            number={ep.parsing?.episode || '?'} 
                          />
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