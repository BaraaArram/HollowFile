import React from 'react';

export default function EpisodeCard({ episode, season, number }) {
  return (
    <div style={{ background: '#232849', borderRadius: 8, padding: 10, minWidth: 140, maxWidth: 180, marginBottom: 6 }}>
      <div style={{ fontWeight: 700, color: 'var(--hk-accent)', fontSize: 15, marginBottom: 2 }}>S{season}E{number}</div>
      <div style={{ color: '#fff', fontSize: 14, marginBottom: 2 }}>{episode.fullApiData?.episode?.name || episode.final?.title || episode.parsing?.cleanTitle || episode.filename}</div>
      <div style={{ color: '#b3b3b3', fontSize: 12, marginBottom: 2 }}>{episode.fullApiData?.episode?.overview || ''}</div>
      <div style={{ color: '#b3b3b3', fontSize: 12 }}>{episode.final?.year || episode.parsing?.year || ''}</div>
    </div>
  );
} 