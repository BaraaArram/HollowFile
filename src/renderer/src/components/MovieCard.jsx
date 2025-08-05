import React, { useState } from 'react';
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

export default function MovieCard({ file, onClick, viewMode = 'grid' }) {
  const [isHovered, setIsHovered] = useState(false);
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
      <div
        className="hk-card movie-card-list"
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 20, 
          padding: 16, 
          cursor: 'pointer', 
          transition: 'all 0.2s ease',
          background: isHovered ? '#2a3155' : '#232849cc',
          borderRadius: 12,
          border: isHovered ? '1px solid var(--hk-accent)' : '1px solid transparent'
        }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        tabIndex={0}
        onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
        aria-label={`View details for ${title}`}
      >
        {/* Poster */}
        <div style={{ 
          flex: '0 0 80px', 
          width: 80, 
          height: 120, 
          borderRadius: 8, 
          overflow: 'hidden',
          boxShadow: '0 4px 12px #0004'
        }}>
          <LazyImage
            src={poster}
            alt={title}
            placeholder="Loading..."
            errorPlaceholder="No Poster"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12, 
            marginBottom: 8,
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              fontWeight: 800, 
              fontSize: 18, 
              color: isHovered ? 'var(--hk-accent)' : '#fff',
              transition: 'color 0.2s ease'
            }}>
              {title}
            </div>
            {year && (
              <div style={{ 
                color: 'var(--hk-text-muted)', 
                fontSize: 16,
                fontWeight: 500
              }}>
                ({year})
              </div>
            )}
            {collection && (
              <div style={{ 
                background: '#1c2038', 
                color: 'var(--hk-accent)', 
                padding: '4px 8px', 
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600
              }}>
                {collection}
              </div>
            )}
          </div>

          {/* Overview */}
          {overview && (
            <div style={{ 
              color: '#b3b3b3', 
              fontSize: 14, 
              lineHeight: 1.4,
              marginBottom: 8,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {overview}
            </div>
          )}

          {/* Stats */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 12,
            flexWrap: 'wrap'
          }}>
            {rating && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4,
                color: '#ffe066',
                fontSize: 14,
                fontWeight: 600
              }}>
                <span>★</span> {rating.toFixed(1)}
              </div>
            )}
            {runtime && (
              <div style={{ 
                color: 'var(--hk-text-muted)', 
                fontSize: 14,
                fontWeight: 500
              }}>
                {Math.floor(runtime / 60)}h {runtime % 60}m
              </div>
            )}
            {resolution && (
              <div style={{ 
                background: '#1c2038', 
                color: 'var(--hk-accent)', 
                padding: '2px 6px', 
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600
              }}>
                {resolution}
              </div>
            )}
          </div>
        </div>

        {/* Arrow indicator */}
        {isHovered && (
          <div style={{
            color: 'var(--hk-accent)',
            fontSize: 18,
            fontWeight: 700,
            marginLeft: 12
          }}>
            →
          </div>
        )}
      </div>
    );
  }

  // Grid view (original)
  return (
    <div
      className="hk-card movie-card"
      style={{ 
        minHeight: 320, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'flex-start', 
        padding: 0, 
        position: 'relative', 
        overflow: 'hidden', 
        cursor: 'pointer', 
        transition: 'all 0.2s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered ? '0 8px 24px #23284966' : '0 4px 16px #23284933'
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && onClick) onClick(); }}
      aria-label={`View details for ${title}`}
    >
      <div style={{ 
        width: '100%', 
        aspectRatio: '2/3', 
        background: '#232849', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        borderRadius: '14px 14px 0 0', 
        overflow: 'hidden', 
        boxShadow: isHovered ? '0 8px 24px #7e8ee688' : '0 4px 16px #7e8ee655', 
        position: 'relative',
        transition: 'all 0.2s ease'
      }}>
        {collection && (
          <div style={{ 
            position: 'absolute', 
            top: 10, 
            left: 10, 
            background: 'var(--hk-accent)', 
            color: '#232849', 
            borderRadius: 8, 
            padding: '2px 12px', 
            fontWeight: 700, 
            fontSize: 13, 
            boxShadow: '0 0 8px #7e8ee655', 
            zIndex: 2, 
            maxWidth: 120, 
            overflow: 'hidden', 
            textOverflow: 'ellipsis', 
            whiteSpace: 'nowrap' 
          }} 
          title={collection}>
            {collection}
          </div>
        )}
        <LazyImage
          src={poster}
          alt={title}
          placeholder="Loading..."
          errorPlaceholder="No Poster"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 0 }}
        />
        {rating && (
          <div style={{ 
            position: 'absolute', 
            top: 10, 
            right: 10, 
            background: '#232849ee', 
            color: 'var(--hk-accent)', 
            borderRadius: 8, 
            padding: '2px 10px', 
            fontWeight: 700, 
            fontSize: 15, 
            boxShadow: '0 0 8px #7e8ee655', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4 
          }}>
            <span style={{ color: '#ffe066', fontSize: 16, marginRight: 3 }}>★</span> {rating.toFixed(1)}
          </div>
        )}
        {resolution && (
          <div style={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 10, 
            background: '#232849ee', 
            color: 'var(--hk-accent)', 
            borderRadius: 8, 
            padding: '2px 10px', 
            fontWeight: 700, 
            fontSize: 13, 
            boxShadow: '0 0 8px #7e8ee655', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4 
          }}>
            {resolution}
          </div>
        )}
      </div>
      <div style={{ 
        marginTop: 12, 
        textAlign: 'center', 
        width: '100%', 
        padding: '0 12px 12px 12px' 
      }}>
        <div style={{ 
          fontWeight: 800, 
          fontSize: 18, 
          color: isHovered ? 'var(--hk-accent)' : 'var(--hk-accent)', 
          textShadow: 'var(--hk-accent-glow)',
          transition: 'color 0.2s ease',
          lineHeight: 1.2
        }}>
          {title}
        </div>
        <div style={{ 
          color: 'var(--hk-text-muted)', 
          fontSize: 15, 
          marginTop: 4 
        }}>
          {year}
        </div>
      </div>
    </div>
  );
} 