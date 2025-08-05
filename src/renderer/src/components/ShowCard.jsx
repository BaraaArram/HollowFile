import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LazyImage from './LazyImage.jsx';

export default function ShowCard({ title, poster, year, seasons, showId, children }) {
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  const totalEpisodes = Object.values(seasons).reduce((a, b) => a + b.length, 0);
  const totalSeasons = Object.keys(seasons).length;
  
  // Get the latest season and episode info
  const latestSeason = Math.max(...Object.keys(seasons).map(s => parseInt(s) || 0));
  const latestEpisode = seasons[latestSeason]?.length || 0;
  
  return (
    <div 
      style={{ 
        background: isHovered ? '#2a3155cc' : '#232849cc', 
        borderRadius: 20, 
        padding: 28, 
        minWidth: 280, 
        maxWidth: 580, 
        boxShadow: isHovered ? '0 8px 32px #23284966' : '0 4px 24px #23284933', 
        marginBottom: 24, 
        width: '100%',
        transition: 'all 0.3s ease',
        border: isHovered ? '1px solid var(--hk-accent)' : '1px solid transparent',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(`/show/${showId}`)}
    >
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '0 0 140px', maxWidth: 140, minWidth: 100, width: '100%', position: 'relative' }}>
          <LazyImage
            src={poster}
            alt={title}
            placeholder="Loading..."
            errorPlaceholder="No Poster"
            style={{ 
              width: '100%', 
              minWidth: 100, 
              maxWidth: 140, 
              borderRadius: 12, 
              boxShadow: isHovered ? '0 8px 24px #7e8ee688' : '0 4px 16px #7e8ee655',
              transition: 'all 0.3s ease'
            }}
          />
          {/* Status indicator */}
          <div style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'var(--hk-accent)',
            color: '#232849',
            borderRadius: 12,
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 700,
            boxShadow: '0 2px 8px #0004'
          }}>
            TV
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <div style={{ 
            fontWeight: 900, 
            fontSize: 26, 
            color: 'var(--hk-accent)', 
            marginBottom: 6,
            lineHeight: 1.2
          }}>
            {title}
          </div>
          <div style={{ 
            color: 'var(--hk-text-muted)', 
            fontSize: 16, 
            marginBottom: 8,
            fontWeight: 500
          }}>
            {year}
          </div>
          
          {/* Stats row */}
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            marginBottom: 16,
            flexWrap: 'wrap'
          }}>
            <div style={{ 
              background: '#1c2038', 
              padding: '6px 12px', 
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff'
            }}>
              {totalSeasons} Season{totalSeasons !== 1 ? 's' : ''}
            </div>
            <div style={{ 
              background: '#1c2038', 
              padding: '6px 12px', 
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff'
            }}>
              {totalEpisodes} Episode{totalEpisodes !== 1 ? 's' : ''}
            </div>
            <div style={{ 
              background: '#1c2038', 
              padding: '6px 12px', 
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#fff'
            }}>
              Latest: S{latestSeason}E{latestEpisode}
            </div>
          </div>
          
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setExpanded(e => !e);
              }}
              style={{ 
                fontSize: 14, 
                fontWeight: 700, 
                background: isHovered ? '#7e8ee6' : 'var(--hk-accent)', 
                color: '#232849', 
                border: 'none', 
                borderRadius: 10, 
                padding: '8px 16px', 
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px #0002'
              }}
            >
              {expanded ? 'Hide Episodes' : 'Show Episodes'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/show/${showId}`);
              }}
              style={{ 
                fontSize: 14, 
                fontWeight: 700, 
                background: 'transparent', 
                color: 'var(--hk-accent)', 
                border: '2px solid var(--hk-accent)', 
                borderRadius: 10, 
                padding: '6px 14px', 
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              View Details
            </button>
          </div>
        </div>
      </div>
      
      {/* Expanded episodes section */}
      {expanded && (
        <div style={{ 
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #1c2038'
        }}>
          {children}
        </div>
      )}
    </div>
  );
} 