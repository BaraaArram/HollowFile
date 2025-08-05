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

export default function ShowsPage() {
  const [shows, setShows] = useState([]);
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

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
      <h1 style={{ marginBottom: '2.2rem', marginTop: 0, fontSize: 32, fontWeight: 900, letterSpacing: 0.5 }}>TV Shows</h1>
      <div className="hk-grid" style={{ margin: 0, gap: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        {shows.length === 0 && <div style={{ color: 'var(--hk-text-muted)', fontSize: 18 }}>No TV shows found.</div>}
        {shows.map(([title, episodes], idx) => {
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
              {Object.entries(seasons).map(([season, eps]) => (
                <div key={season} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, color: 'var(--hk-accent)', fontSize: 17, marginBottom: 4 }}>Season {season}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    {eps.sort((a, b) => (a.parsing?.episode || 0) - (b.parsing?.episode || 0)).map((ep, i) => (
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