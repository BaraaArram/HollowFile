import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function EpisodeDetailPage() {
  const { showId, season, episode } = useParams();
  const navigate = useNavigate();
  const [ep, setEp] = useState(null);
  useEffect(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          const found = results.find(f => (
            f.final?.type === 'tv' &&
            (String(f.final?.id) === showId || String(f.fullApiData?.show?.id) === showId) &&
            String(f.parsing?.season || f.fullApiData?.episode?.season_number) === season &&
            String(f.parsing?.episode || f.fullApiData?.episode?.episode_number) === episode
          ));
          setEp(found || null);
        }
      });
    }
  }, [showId, season, episode]);
  
  if (!ep) return <div style={{ color: 'var(--hk-text-muted)', fontSize: 18, margin: 40 }}>Episode not found.</div>;
  
  const poster = ep.final?.poster || ep.final?.poster_path;
  const episodeData = ep.fullApiData?.episode || {};
  const showData = ep.fullApiData?.show || {};
  const title = episodeData.name || ep.final?.title || ep.parsing?.cleanTitle || ep.filename;
  const showTitle = showData.name || ep.final?.showTitle || '';
  const overview = episodeData.overview || ep.final?.overview || '';
  const year = ep.final?.year || ep.parsing?.year || '';
  const airDate = episodeData.air_date ? new Date(episodeData.air_date).toLocaleDateString() : '';
  const rating = episodeData.vote_average ? `${episodeData.vote_average.toFixed(1)}/10` : '';
  const runtime = episodeData.runtime ? `${episodeData.runtime} min` : '';
  const crew = episodeData.crew || [];
  const director = crew.find(c => c.job === 'Director')?.name;
  const writer = crew.find(c => c.job === 'Writer')?.name;
  
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
          {ep.path && (
            <button
              onClick={() => { if (window.api && window.api.openFile) window.api.openFile(ep.path); }}
              className="hk-navbar-btn"
              style={{ fontSize: 20, padding: '0.9rem 2.5rem', fontWeight: 900, marginTop: 10, background: 'var(--hk-accent)', color: '#232849', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' }}
            >
              <span role="img" aria-label="play" style={{ fontSize: 26 }}>▶️</span> Play
            </button>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 17, marginBottom: 4 }}>{showTitle}</div>
          <div style={{ fontWeight: 900, fontSize: 28, color: 'var(--hk-accent)', marginBottom: 6 }}>{title}</div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 17, marginBottom: 8 }}>
            Season {season} Episode {episode} {year && <>| {year}</>}
          </div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 16, marginBottom: 18, lineHeight: 1.6 }}>{overview}</div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 24 }}>
            {airDate && (
              <div style={{ background: '#232849', padding: '12px 16px', borderRadius: 10 }}>
                <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Air Date</div>
                <div style={{ color: '#fff', fontSize: 15 }}>{airDate}</div>
              </div>
            )}
            {runtime && (
              <div style={{ background: '#232849', padding: '12px 16px', borderRadius: 10 }}>
                <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Runtime</div>
                <div style={{ color: '#fff', fontSize: 15 }}>{runtime}</div>
              </div>
            )}
            {rating && (
              <div style={{ background: '#232849', padding: '12px 16px', borderRadius: 10 }}>
                <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Rating</div>
                <div style={{ color: '#fff', fontSize: 15 }}>{rating}</div>
              </div>
            )}
            {director && (
              <div style={{ background: '#232849', padding: '12px 16px', borderRadius: 10 }}>
                <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Director</div>
                <div style={{ color: '#fff', fontSize: 15 }}>{director}</div>
              </div>
            )}
            {writer && (
              <div style={{ background: '#232849', padding: '12px 16px', borderRadius: 10 }}>
                <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Writer</div>
                <div style={{ color: '#fff', fontSize: 15 }}>{writer}</div>
              </div>
            )}
          </div>
          
          {ep.path && (
            <div style={{ background: '#232849', padding: '12px 16px', borderRadius: 10, marginTop: 24 }}>
              <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>File Location</div>
              <div style={{ color: '#fff', fontSize: 15, wordBreak: 'break-all' }}>{ep.path}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 