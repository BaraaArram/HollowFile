import React from 'react';
import LazyImage from './LazyImage.jsx';

function getRating(file) {
  return file.final?.vote_average || file.fullApiData?.movie?.vote_average || null;
}

function getResolution(file) {
  const str = file.filename + ' ' + file.path;
  const match = str.match(/(2160p|1080p|720p|480p|4K|8K)/i);
  return match ? match[0].toUpperCase() : null;
}

function getCollectionName(file) {
  return file.fullApiData?.movie?.belongs_to_collection?.name || null;
}

function getOverview(file) {
  return file.final?.overview || file.fullApiData?.movie?.overview || '';
}

function getRuntime(file) {
  return file.final?.runtime || file.fullApiData?.movie?.runtime || null;
}

function MiniRating({ rating }) {
  const pct = (rating / 10) * 100;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = rating >= 7 ? '#22d3ee' : rating >= 5 ? '#fbbf24' : '#ef4444';
  return (
    <div className="mc-rating">
      <svg width="38" height="38" viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} fill="rgba(0,0,0,0.65)" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <circle cx="19" cy="19" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
      </svg>
      <span className="mc-rating-text" style={{ color }}>{rating.toFixed(1)}</span>
    </div>
  );
}

export default function MovieCard({ file, onClick, viewMode = 'grid' }) {
  const poster = file.final?.poster;
  const title = file.final?.title || file.parsing?.cleanTitle || file.filename;
  const year = file.final?.year || file.parsing?.year || '';
  const rating = getRating(file);
  const resolution = getResolution(file);
  const collection = getCollectionName(file);
  const overview = getOverview(file);
  const runtime = getRuntime(file);

  if (viewMode === 'list') {
    return (
      <div className="mc mc-list" onClick={onClick} tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
        aria-label={`View details for ${title}`}>
        <div className="mc-list-poster">
          <LazyImage src={poster} alt={title} placeholder="" errorPlaceholder="No Poster"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div className="mc-list-body">
          <div className="mc-list-top">
            <span className="mc-list-title">{title}</span>
            {year && <span className="mc-list-year">({year})</span>}
          </div>
          <div className="mc-list-meta">
            {rating && <MiniRating rating={rating} />}
            {runtime && <span className="mc-list-runtime">{Math.floor(runtime / 60)}h {runtime % 60}m</span>}
            {resolution && <span className="mc-badge">{resolution}</span>}
            {collection && <span className="mc-badge mc-badge-collection">{collection}</span>}
          </div>
          {overview && <div className="mc-list-overview">{overview}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mc mc-grid" onClick={onClick} tabIndex={0}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
      aria-label={`View details for ${title}`}>
      <div className="mc-poster">
        <LazyImage src={poster} alt={title} placeholder="" errorPlaceholder="No Poster"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div className="mc-poster-overlay" />
        {rating && <div className="mc-rating-badge"><MiniRating rating={rating} /></div>}
        {collection && <div className="mc-collection-badge" title={collection}>{collection}</div>}
        {resolution && <div className="mc-res-badge">{resolution}</div>}
      </div>
      <div className="mc-info">
        <div className="mc-title">{title}</div>
        <div className="mc-year">{year}</div>
      </div>
    </div>
  );
}