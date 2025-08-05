import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EpisodeCard({ episode, season, number }) {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
  const episodeTitle = episode.fullApiData?.episode?.name || episode.final?.title || episode.parsing?.cleanTitle || episode.filename;
  const episodeOverview = episode.fullApiData?.episode?.overview || '';
  const episodeYear = episode.final?.year || episode.parsing?.year || '';
  const showId = episode.final?.id || episode.fullApiData?.show?.id || episode.filename;
  
  return (
    <div 
      style={{ 
        background: isHovered ? '#2a3155' : '#232849', 
        borderRadius: 12, 
        padding: 16, 
        minWidth: 160, 
        maxWidth: 200, 
        marginBottom: 8,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        border: isHovered ? '1px solid var(--hk-accent)' : '1px solid transparent',
        boxShadow: isHovered ? '0 4px 16px #23284966' : '0 2px 8px #23284933'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/show/${showId}/episode/${season}/${number}`)}
    >
      {/* Episode number badge */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 8 
      }}>
        <div style={{ 
          background: 'var(--hk-accent)', 
          color: '#232849', 
          borderRadius: 8, 
          padding: '4px 8px', 
          fontSize: 12, 
          fontWeight: 700,
          minWidth: 'fit-content'
        }}>
          S{season}E{number}
        </div>
        {episodeYear && (
          <div style={{ 
            color: 'var(--hk-text-muted)', 
            fontSize: 12, 
            fontWeight: 500 
          }}>
            {episodeYear}
          </div>
        )}
      </div>
      
      {/* Episode title */}
      <div style={{ 
        fontWeight: 700, 
        color: isHovered ? 'var(--hk-accent)' : '#fff', 
        fontSize: 14, 
        marginBottom: 6,
        lineHeight: 1.3,
        transition: 'color 0.2s ease'
      }}>
        {episodeTitle}
      </div>
      
      {/* Episode overview (truncated) */}
      {episodeOverview && (
        <div style={{ 
          color: '#b3b3b3', 
          fontSize: 12, 
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {episodeOverview}
        </div>
      )}
      
      {/* Hover indicator */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: 'var(--hk-accent)',
          color: '#232849',
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 10,
          fontWeight: 700
        }}>
          →
        </div>
      )}
    </div>
  );
} 