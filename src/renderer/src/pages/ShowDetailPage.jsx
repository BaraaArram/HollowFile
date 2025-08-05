import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function ShowDetailPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const [episodes, setEpisodes] = useState([]);
  useEffect(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          const eps = results.filter(f => (f.final?.type === 'tv') && (String(f.final?.id) === showId || String(f.fullApiData?.show?.id) === showId));
          setEpisodes(eps);
        }
      });
    }
  }, [showId]);
  if (episodes.length === 0) return <div style={{ color: 'var(--hk-text-muted)', fontSize: 18, margin: 40 }}>Show not found.</div>;
  const show = episodes[0];
  const poster = show.final?.poster || show.final?.poster_path;
  const title = show.final?.title || show.parsing?.cleanTitle || show.filename;
  const year = show.final?.year || show.parsing?.year || '';
  const overview = show.final?.overview || show.fullApiData?.show?.overview || '';
  const seasons = groupBySeason(episodes);
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <button onClick={() => navigate(-1)} className="hk-navbar-btn" style={{ marginBottom: 24 }}>← Back</button>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 180px', maxWidth: 180 }}>
          {poster ? (
            <img src={poster.startsWith('file://') ? poster : `file://${poster}`} alt={title} style={{ width: 180, borderRadius: 12, boxShadow: '0 0 16px #7e8ee655', marginBottom: 18 }} />
          ) : (
            <div style={{ color: '#7e8ee6', fontWeight: 700, fontSize: 22, opacity: 0.7, textAlign: 'center', width: 180, height: 260, background: '#232849', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>No Poster</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 900, fontSize: 32, color: 'var(--hk-accent)', marginBottom: 6 }}>{title}</div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 18, marginBottom: 8 }}>{year}</div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 16, marginBottom: 18, lineHeight: 1.6 }}>{overview}</div>
        </div>
      </div>
      <div style={{ marginTop: 32 }}>
        {Object.entries(seasons).map(([season, eps]) => (
          <div key={season} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 800, color: 'var(--hk-accent)', fontSize: 20, marginBottom: 8 }}>Season {season}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {eps.sort((a, b) => (a.parsing?.episode || 0) - (b.parsing?.episode || 0)).map((ep, i) => (
                <div key={ep.filename + i} style={{ cursor: 'pointer' }} onClick={() => navigate(`/show/${showId}/episode/${ep.parsing?.season || season}/${ep.parsing?.episode || i+1}`)}>
                  <EpisodeCard episode={ep} season={season} number={ep.parsing?.episode || '?'} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 