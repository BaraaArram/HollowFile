import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EpisodeCard from '../components/EpisodeCard';
import { useOffline } from '../contexts/offlineContextState';

function groupBySeason(episodes) {
  const seasons = {};
  for (const ep of episodes) {
    const season = ep.parsing?.season || ep.fullApiData?.episode?.season_number || '1';
    if (!seasons[season]) seasons[season] = [];
    seasons[season].push(ep);
  }
  return seasons;
}

function toFileUrl(p) {
  if (!p) return '';
  const normalized = p.replace(/\\/g, '/');
  if (normalized.startsWith('file://')) return normalized;
  if (normalized.match(/^[a-z]:/i)) {
    const parts = normalized.split('/');
    return `file:///${parts[0]}/${parts.slice(1).map(s => encodeURIComponent(s)).join('/')}`;
  }
  // TMDB relative path like /abc.jpg — resolve to remote URL
  if (normalized.startsWith('/')) {
    return `https://image.tmdb.org/t/p/original${normalized}`;
  }
  return `file://${normalized}`;
}

export default function ShowDetailPage() {
  const { showId } = useParams();
  const navigate = useNavigate();
  const { isOffline } = useOffline();
  const [episodes, setEpisodes] = useState([]);
  const [activeSeason, setActiveSeason] = useState(null);
  const [trailers, setTrailers] = useState([]);
  const [showTrailers] = useState(() => localStorage.getItem('showTrailers') === 'true');
  const [activeTrailer, setActiveTrailer] = useState(null);
  const [trailerStatuses, setTrailerStatuses] = useState({});
  const [downloadingTrailers, setDownloadingTrailers] = useState({});

  useEffect(() => {
    if (window.api && window.api.getLastScanResults) {
      window.api.getLastScanResults().then((results) => {
        if (Array.isArray(results)) {
          const eps = results.filter(f => (f.final?.type === 'tv') && (String(f.final?.id) === showId || String(f.fullApiData?.show?.id) === showId));
          setEpisodes(eps);
        }
      });
    }
  }, [showId]);

  // Reload when images are changed via ImageBrowserModal
  useEffect(() => {
    const handler = () => {
      if (window.api?.getLastScanResults) {
        window.api.getLastScanResults().then((results) => {
          if (Array.isArray(results)) {
            const eps = results.filter(f => (f.final?.type === 'tv') && (String(f.final?.id) === showId || String(f.fullApiData?.show?.id) === showId));
            setEpisodes(eps);
          }
        });
      }
    };
    window.addEventListener('media-data-changed', handler);
    return () => window.removeEventListener('media-data-changed', handler);
  }, [showId]);

  // Load trailers for the show
  useEffect(() => {
    if (!showTrailers || !showId || !window.api?.getTrailers) return;
    let cancelled = false;
    // Check if any episode has stored videos
    const storedVideos = episodes[0]?.fullApiData?.videos;
    if (storedVideos && storedVideos.length > 0) {
      setTrailers(storedVideos);
      return;
    }
    // Skip API call when offline — only show stored videos
    if (isOffline) return;
    window.api.getTrailers(parseInt(showId), 'tv').then(res => {
      if (cancelled) return;
      if (res?.success && res.videos?.length > 0) {
        setTrailers(res.videos);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [showId, showTrailers, episodes, isOffline]);

  // Check which trailers are already downloaded
  useEffect(() => {
    if (trailers.length === 0 || !window.api?.getTrailerStatuses) return;
    const keys = trailers.map(t => t.key);
    window.api.getTrailerStatuses(keys).then(res => {
      if (res?.success) {
        const map = {};
        res.statuses.forEach(s => { map[s.key] = s; });
        setTrailerStatuses(map);
      }
    });
  }, [trailers]);

  // Listen for trailer download progress
  useEffect(() => {
    if (!window.api?.onTrailerDownloadProgress) return;
    const unsub = window.api.onTrailerDownloadProgress(({ videoKey, percent }) => {
      setDownloadingTrailers(prev => ({ ...prev, [videoKey]: percent }));
    });
    return unsub;
  }, []);

  const handleDownloadTrailer = async (videoKey) => {
    if (isOffline) return;
    if (downloadingTrailers[videoKey] !== undefined) return;
    setDownloadingTrailers(prev => ({ ...prev, [videoKey]: 0 }));
    try {
      const res = await window.api.downloadTrailer(videoKey);
      if (res?.success) {
        setTrailerStatuses(prev => ({ ...prev, [videoKey]: { key: videoKey, downloaded: true, path: res.path } }));
        setActiveTrailer(videoKey);
      }
    } catch {
      void 0;
    }
    setDownloadingTrailers(prev => {
      const next = { ...prev };
      delete next[videoKey];
      return next;
    });
  };

  const handlePlayTrailer = (videoKey) => {
    const status = trailerStatuses[videoKey];
    if (status?.downloaded) {
      setActiveTrailer(videoKey);
    } else {
      handleDownloadTrailer(videoKey);
    }
  };

  if (episodes.length === 0) {
    return <div className="dp-loading"><div className="dp-loading-spinner" /><span>Show not found.</span></div>;
  }

  const show = episodes[0];
  const poster = show.final?.poster || show.final?.poster_path;
  const backdropLocal = show.final?.backdrop_path || show.backdrop_path;
  const backdropTmdb = show.fullApiData?.show?.backdrop_path;
  // Prefer local file if it's an absolute path, otherwise fall back to TMDB remote
  const backdrop = (backdropLocal && backdropLocal.match(/^[a-z]:/i)) ? backdropLocal
    : (backdropLocal && backdropLocal.startsWith('file://')) ? backdropLocal
    : (backdropTmdb || backdropLocal);
  const title = show.final?.title || show.parsing?.cleanTitle || show.filename;
  const year = show.final?.year || show.parsing?.year || '';
  const overview = show.final?.overview || show.fullApiData?.show?.overview || '';
  const rating = show.fullApiData?.show?.vote_average;
  const seasons = groupBySeason(episodes);
  const seasonKeys = Object.keys(seasons).sort((a, b) => parseInt(a) - parseInt(b));
  const currentSeason = activeSeason || seasonKeys[0];
  const currentEps = (seasons[currentSeason] || []).sort((a, b) => (a.parsing?.episode || 0) - (b.parsing?.episode || 0));

  return (
    <div className="sdp">
      {/* Hero */}
      <section className="sdp-hero">
        {backdrop && <div className="sdp-hero-bg" style={{ backgroundImage: `url("${toFileUrl(backdrop)}")` }} />}
        <div className="sdp-hero-fade" />
        <button className="dp-back" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back
        </button>
        <div className="sdp-hero-inner">
          <div className="sdp-poster-wrap">
            {poster ? (
              <img className="sdp-poster" src={toFileUrl(poster)} alt={title} />
            ) : (
              <div className="sdp-poster sdp-poster-empty">No Poster</div>
            )}
          </div>
          <div className="sdp-hero-info">
            <h1 className="sdp-title">{title}</h1>
            <div className="sdp-meta">
              {year && <span className="dp-pill">{year}</span>}
              <span className="dp-pill">{seasonKeys.length} Season{seasonKeys.length !== 1 ? 's' : ''}</span>
              <span className="dp-pill">{episodes.length} Episode{episodes.length !== 1 ? 's' : ''}</span>
              {rating > 0 && <span className="dp-pill" style={{ color: '#ffe066' }}>★ {rating.toFixed(1)}</span>}
            </div>
            {overview && <p className="sdp-overview">{overview}</p>}
          </div>
        </div>
      </section>

      {/* Season Tabs */}
      <div className="sdp-body">
        {/* Trailers Section */}
        {showTrailers && trailers.length > 0 && (
          <div className="dp-trailers sdp-trailers-section">
            <h2 className="dp-section-heading">Trailers & Videos</h2>
            {/* Video Player */}
            {activeTrailer && trailerStatuses[activeTrailer]?.downloaded && (
              <div className="dp-trailer-player-wrap">
                <video
                  key={activeTrailer}
                  className="dp-trailer-video"
                  controls
                  autoPlay
                  src={`file:///${trailerStatuses[activeTrailer].path.replace(/\\/g, '/')}`}
                />
                <div className="dp-trailer-player-info">
                  <span className="dp-trailer-player-name">{trailers.find(t => t.key === activeTrailer)?.name}</span>
                  <button className="dp-trailer-player-close" onClick={() => setActiveTrailer(null)}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    Close
                  </button>
                </div>
              </div>
            )}
            {/* Trailer Cards */}
            <div className="dp-trailer-grid">
              {trailers.map((v) => {
                const status = trailerStatuses[v.key];
                const dlProgress = downloadingTrailers[v.key];
                const isDownloading = dlProgress !== undefined;
                const isPlaying = activeTrailer === v.key;
                const canPlay = status?.downloaded;
                const unavailableOffline = isOffline && !canPlay;
                return (
                  <div
                    key={v.key}
                    className={`dp-trailer-card${isPlaying ? ' dp-trailer-card-active' : ''}${unavailableOffline ? ' dp-trailer-card-offline' : ''}`}
                    onClick={() => !unavailableOffline && handlePlayTrailer(v.key)}
                  >
                    <div className="dp-trailer-card-thumb">
                      {!isOffline ? (
                        <img src={`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`} alt={v.name} className="dp-trailer-card-img" loading="lazy" />
                      ) : (
                        <div className="dp-trailer-card-img dp-trailer-thumb-offline">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M9.5 8.5v5l4.5-2.5-4.5-2.5z" fill="currentColor"/></svg>
                        </div>
                      )}
                      <div className="dp-trailer-card-overlay">
                        {unavailableOffline ? (
                          <div className="dp-trailer-card-offline-msg">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span>Offline</span>
                          </div>
                        ) : isDownloading ? (
                          <div className="dp-trailer-card-dl-progress">
                            <svg width="48" height="48" viewBox="0 0 48 48">
                              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                              <circle cx="24" cy="24" r="20" fill="none" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 20}`}
                                strokeDashoffset={`${2 * Math.PI * 20 * (1 - (dlProgress || 0) / 100)}`}
                                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }} />
                            </svg>
                            <span className="dp-trailer-card-dl-pct">{dlProgress || 0}%</span>
                          </div>
                        ) : canPlay ? (
                          <div className="dp-trailer-card-play">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M10 6v20l17-10L10 6z" fill="currentColor"/></svg>
                          </div>
                        ) : (
                          <div className="dp-trailer-card-download">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span>Download</span>
                          </div>
                        )}
                      </div>
                      <div className="dp-trailer-card-badges">
                        <span className={`dp-trailer-badge dp-trailer-badge-${v.type?.toLowerCase()}`}>{v.type}</span>
                        {v.official && <span className="dp-trailer-badge dp-trailer-badge-official">Official</span>}
                        {canPlay && <span className="dp-trailer-badge dp-trailer-badge-downloaded">Downloaded</span>}
                      </div>
                    </div>
                    <div className="dp-trailer-card-body">
                      <span className="dp-trailer-card-name">{v.name}</span>
                      <span className="dp-trailer-card-sub">{canPlay ? 'Click to play' : unavailableOffline ? 'Not downloaded — unavailable offline' : isDownloading ? 'Downloading...' : 'Click to download & play'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="sdp-season-tabs">
          {seasonKeys.map(s => (
            <button
              key={s}
              className={`sdp-season-tab${currentSeason === s ? ' active' : ''}`}
              onClick={() => setActiveSeason(s)}
            >
              Season {s}
              <span className="sdp-season-count">{seasons[s].length}</span>
            </button>
          ))}
        </div>

        {/* Episodes Grid */}
        <div className="sdp-episodes">
          {currentEps.map((ep, i) => (
            <div
              key={ep.filename + i}
              className="sdp-ep-wrap"
              onClick={() => navigate(`/show/${showId}/episode/${ep.parsing?.season || currentSeason}/${ep.parsing?.episode || i + 1}`)}
            >
              <EpisodeCard episode={ep} season={currentSeason} number={ep.parsing?.episode || '?'} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}