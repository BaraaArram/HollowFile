import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage.jsx';

export default function ShowCard({ title, poster, year, seasons, showId, children }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();
  const totalEpisodes = Object.values(seasons).reduce((a, b) => a + b.length, 0);
  const totalSeasons = Object.keys(seasons).length;

  return (
    <div className="sc" onClick={() => navigate(`/show/${showId}`)}>
      <div className="sc-inner">
        <div className="sc-poster-wrap">
          <LazyImage src={poster} alt={title} placeholder="" errorPlaceholder="No Poster"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
          <div className="sc-type-badge">TV</div>
        </div>
        <div className="sc-body">
          <div className="sc-title">{title}</div>
          <div className="sc-year">{year}</div>
          <div className="sc-stats">
            <span className="sc-stat">{totalSeasons} Season{totalSeasons !== 1 ? 's' : ''}</span>
            <span className="sc-stat">{totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}</span>
          </div>
          <div className="sc-actions">
            <button className="sc-btn-primary" onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}>
              {expanded ? 'Hide Episodes' : 'Show Episodes'}
            </button>
            <button className="sc-btn-ghost" onClick={(e) => { e.stopPropagation(); navigate(`/show/${showId}`); }}>
              View Details
            </button>
          </div>
        </div>
      </div>
      {expanded && <div className="sc-episodes">{children}</div>}
    </div>
  );
}
