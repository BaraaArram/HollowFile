import React from 'react';

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

export default function MovieCard({ file, onClick }) {
  const poster = file.final?.poster;
  const title = file.final?.title || file.parsing?.cleanTitle || file.filename;
  const year = file.final?.year || file.parsing?.year || '';
  const rating = getRating(file);
  const resolution = getResolution(file);
  const collection = getCollectionName(file);

  return (
    <div
      className="hk-card movie-card"
      style={{ minHeight: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: 0, position: 'relative', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.18s, transform 0.18s' }}
      onClick={onClick}
      tabIndex={0}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
      aria-label={`View details for ${title}`}
    >
      <div style={{ width: '100%', aspectRatio: '2/3', background: '#232849', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '14px 14px 0 0', overflow: 'hidden', boxShadow: '0 0 16px #7e8ee655', position: 'relative' }}>
        {collection && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: 'var(--hk-accent)', color: '#232849', borderRadius: 8, padding: '2px 12px', fontWeight: 700, fontSize: 13, boxShadow: '0 0 8px #7e8ee655', zIndex: 2, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={collection}>
            {collection}
          </div>
        )}
        {poster ? (
          <img src={poster.startsWith('file://') ? poster : `file://${poster}`} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0, transition: 'transform 0.2s' }} />
        ) : (
          <div style={{ color: '#7e8ee6', fontWeight: 700, fontSize: 22, opacity: 0.7, textAlign: 'center', width: '100%' }}>
            No Poster
          </div>
        )}
        {rating && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#232849ee', color: 'var(--hk-accent)', borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 15, boxShadow: '0 0 8px #7e8ee655', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: '#ffe066', fontSize: 16, marginRight: 3 }}>★</span> {rating.toFixed(1)}
          </div>
        )}
        {resolution && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: '#232849ee', color: 'var(--hk-accent)', borderRadius: 8, padding: '2px 10px', fontWeight: 700, fontSize: 13, boxShadow: '0 0 8px #7e8ee655', display: 'flex', alignItems: 'center', gap: 4 }}>
            {resolution}
          </div>
        )}
      </div>
      <div style={{ marginTop: 12, textAlign: 'center', width: '100%' }}>
        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--hk-accent)', textShadow: 'var(--hk-accent-glow)' }}>{title}</div>
        <div style={{ color: 'var(--hk-text-muted)', fontSize: 15, marginTop: 2 }}>{year}</div>
      </div>
    </div>
  );
} 