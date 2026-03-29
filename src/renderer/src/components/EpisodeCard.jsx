import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function EpisodeCard({ episode, season, number }) {
  const navigate = useNavigate();
  const episodeTitle = episode.fullApiData?.episode?.name || episode.final?.title || episode.parsing?.cleanTitle || episode.filename;
  const episodeOverview = episode.fullApiData?.episode?.overview || '';
  const showId = episode.final?.id || episode.fullApiData?.show?.id || episode.filename;

  return (
    <div className="ec" onClick={() => navigate(`/show/${showId}/episode/${season}/${number}`)}>
      <div className="ec-badge">S{season}E{number}</div>
      <div className="ec-title">{episodeTitle}</div>
      {episodeOverview && <div className="ec-overview">{episodeOverview}</div>}
    </div>
  );
}
