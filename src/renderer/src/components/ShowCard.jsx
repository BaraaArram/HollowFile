import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ShowCard({ title, poster, year, seasons, showId, children }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const totalEpisodes = Object.values(seasons).reduce((a, b) => a + b.length, 0);
  
  return (
    <div style={{ background: '#232849cc', borderRadius: 16, padding: 24, minWidth: 220, maxWidth: 520, boxShadow: '0 0 24px #23284933', marginBottom: 24, width: '100%' }}>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 120px', maxWidth: 120, minWidth: 80, width: '100%' }}>
          {poster ? (
            <img src={poster.startsWith('file://') ? poster : `file://${poster}`} alt={title} style={{ width: '100%', minWidth: 80, maxWidth: 120, borderRadius: 10, boxShadow: '0 0 12px #7e8ee655' }} />
          ) : (
            <div style={{ color: '#7e8ee6', fontWeight: 700, fontSize: 18, opacity: 0.7, textAlign: 'center', width: 120, height: 180, background: '#232849', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Poster</div>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <div style={{ fontWeight: 900, fontSize: 24, color: 'var(--hk-accent)', marginBottom: 4 }}>{title}</div>
          <div style={{ color: 'var(--hk-text-muted)', fontSize: 16, marginBottom: 6 }}>{year}</div>
          <div style={{ color: 'var(--hk-accent)', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
            {Object.keys(seasons).length} Season{Object.keys(seasons).length !== 1 ? 's' : ''} | {totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ fontSize: 15, fontWeight: 700, background: 'var(--hk-accent)', color: '#232849', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', cursor: 'pointer', marginTop: 6 }}
            >
              {expanded ? 'Hide Episodes' : 'Show Episodes'}
            </button>
            <button
              onClick={() => navigate(`/show/${showId}`)}
              style={{ fontSize: 15, fontWeight: 700, background: '#fff', color: '#232849', border: 'none', borderRadius: 8, padding: '0.5rem 1.2rem', cursor: 'pointer', marginTop: 6 }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{ marginTop: 18 }}>{children}</div>
      )}
    </div>
  );
} 